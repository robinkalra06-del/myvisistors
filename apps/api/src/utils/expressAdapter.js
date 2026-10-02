import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

let realExpress = null;
try {
  // Try importing express if installed
  const mod = await import('express');
  realExpress = mod.default || mod;
} catch (e) {
  // Express not installed locally; use lightweight native engine
}

class MiniRouter {
  constructor() {
    this.routes = [];
    this.middlewares = [];
  }

  use(...args) {
    if (typeof args[0] === 'string') {
      const prefix = args[0];
      const handler = args[1];
      this.middlewares.push({ prefix, handler });
    } else {
      this.middlewares.push({ prefix: '', handler: args[0] });
    }
  }

  addRoute(method, pattern, ...handlers) {
    // Convert /:id or /:param to regex
    const paramNames = [];
    const regexPattern = pattern.replace(/:([a-zA-Z0-9_]+)/g, (_, name) => {
      paramNames.push(name);
      return '([^/]+)';
    });
    const regex = new RegExp(`^${regexPattern}$`);
    this.routes.push({ method, pattern, regex, paramNames, handlers });
  }

  get(pattern, ...handlers) { this.addRoute('GET', pattern, ...handlers); }
  post(pattern, ...handlers) { this.addRoute('POST', pattern, ...handlers); }
  patch(pattern, ...handlers) { this.addRoute('PATCH', pattern, ...handlers); }
  delete(pattern, ...handlers) { this.addRoute('DELETE', pattern, ...handlers); }
  put(pattern, ...handlers) { this.addRoute('PUT', pattern, ...handlers); }
}

function createMiniExpress() {
  const rootRouter = new MiniRouter();

  const app = function (req, res) {
    // Parse URL and query
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    req.originalUrl = req.url;
    req.path = parsedUrl.pathname;
    req.query = Object.fromEntries(parsedUrl.searchParams.entries());
    req.params = {};

    // Augment Response
    res.status = function (code) {
      res.statusCode = code;
      return res;
    };
    res.sendStatus = function (code) {
      res.statusCode = code;
      res.end();
      return res;
    };
    res.json = function (obj) {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(obj));
      return res;
    };
    res.send = function (body) {
      if (typeof body === 'object') {
        return res.json(body);
      }
      res.end(body);
      return res;
    };

    // Execute middleware chain
    const allMiddlewares = [...rootRouter.middlewares];
    let mIndex = 0;

    function nextMiddleware(err) {
      if (err) {
        // Find error handler
        for (const mw of allMiddlewares) {
          if (mw.handler.length === 4) {
            return mw.handler(err, req, res, () => {});
          }
        }
        res.statusCode = err.statusCode || 500;
        return res.end(JSON.stringify({ error: err.message }));
      }

      if (mIndex < allMiddlewares.length) {
        const mw = allMiddlewares[mIndex++];
        if (!mw.prefix || req.path.startsWith(mw.prefix)) {
          // If sub-router
          if (mw.handler instanceof MiniRouter) {
            return handleSubRouter(mw.prefix, mw.handler, req, res, nextMiddleware);
          }
          if (mw.handler.length <= 3) {
            return mw.handler(req, res, nextMiddleware);
          }
        }
        return nextMiddleware();
      }

      // Check root routes
      matchRoute(rootRouter, '', req, res, (routeErr) => {
        if (routeErr) return nextMiddleware(routeErr);
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: false, error: { message: `Not Found: ${req.method} ${req.path}` } }));
      });
    }

    // Auto-read request body if method has body
    if (['POST', 'PATCH', 'PUT'].includes(req.method) && req.body === undefined) {
      let bodyData = '';
      req.on('data', chunk => { bodyData += chunk; });
      req.on('end', () => {
        const contentType = req.headers['content-type'] || '';
        if (contentType.includes('application/json') || bodyData.trim().startsWith('{')) {
          try {
            req.body = JSON.parse(bodyData);
          } catch {
            req.body = bodyData;
          }
        } else {
          req.body = bodyData;
        }
        nextMiddleware();
      });
    } else {
      nextMiddleware();
    }
  };

  function handleSubRouter(prefix, subRouter, req, res, parentNext) {
    const subPath = req.path.substring(prefix.length) || '/';
    const originalPath = req.path;
    req.path = subPath;

    let subMwIndex = 0;
    function nextSubMw(err) {
      if (err) return parentNext(err);
      if (subMwIndex < subRouter.middlewares.length) {
        const mw = subRouter.middlewares[subMwIndex++];
        if (!mw.prefix || req.path.startsWith(mw.prefix)) {
          return mw.handler(req, res, nextSubMw);
        }
        return nextSubMw();
      }

      // Match routes in subRouter
      matchRoute(subRouter, prefix, req, res, (routeErr) => {
        req.path = originalPath;
        if (routeErr) return parentNext(routeErr);
        parentNext();
      });
    }

    nextSubMw();
  }

  function matchRoute(router, prefix, req, res, nextCallback) {
    for (const r of router.routes) {
      if (r.method === req.method || r.method === 'ALL') {
        const match = req.path.match(r.regex);
        if (match) {
          req.params = {};
          r.paramNames.forEach((name, idx) => {
            req.params[name] = match[idx + 1];
          });

          // Run route handlers
          let hIdx = 0;
          function runHandler(err) {
            if (err) return nextCallback(err);
            if (hIdx < r.handlers.length) {
              const h = r.handlers[hIdx++];
              return h(req, res, runHandler);
            }
          }
          return runHandler();
        }
      }
    }
    nextCallback();
  }

  app.use = (...args) => rootRouter.use(...args);
  app.get = (...args) => rootRouter.get(...args);
  app.post = (...args) => rootRouter.post(...args);
  app.patch = (...args) => rootRouter.patch(...args);
  app.delete = (...args) => rootRouter.delete(...args);

  return app;
}

const express = realExpress || function () {
  return createMiniExpress();
};

express.Router = realExpress?.Router || function () {
  return new MiniRouter();
};

express.json = realExpress?.json || function () {
  return (req, res, next) => next();
};

express.urlencoded = realExpress?.urlencoded || function () {
  return (req, res, next) => next();
};

express.text = realExpress?.text || function () {
  return (req, res, next) => next();
};

express.static = realExpress?.static || function (dir) {
  return (req, res, next) => {
    const filePath = path.join(dir, req.path.replace(/^\//, ''));
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const contentTypes = {
        '.js': 'application/javascript',
        '.html': 'text/html',
        '.css': 'text/css',
        '.json': 'application/json',
        '.svg': 'image/svg+xml'
      };
      res.setHeader('Content-Type', contentTypes[ext] || 'text/plain');
      fs.createReadStream(filePath).pipe(res);
      return;
    }
    next();
  };
};

export default express;
export const Router = express.Router;
