import React, { useState } from 'react';
import { Video, ShieldCheck, Heart, Mail, ExternalLink, X } from 'lucide-react';

export const Footer: React.FC = () => {
  const [activeModal, setActiveModal] = useState<'privacy' | 'terms' | 'about' | 'contact' | null>(null);
  const [contactSent, setContactSent] = useState(false);

  return (
    <>
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
            
            {/* Col 1: Brand */}
            <div className="space-y-4 md:col-span-1">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                  <Video className="w-4 h-4" />
                </div>
                <span className="text-lg font-bold text-slate-900 dark:text-white">PulseMeet</span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Enterprise-grade real-time video conferencing designed for seamless collaboration, crystal clear audio, and zero-compromise security.
              </p>
              <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                <ShieldCheck className="w-4 h-4" />
                <span>256-bit WebRTC Encrypted Streams</span>
              </div>
            </div>

            {/* Col 2: Product */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-4">Product</h4>
              <ul className="space-y-2.5 text-sm text-slate-600 dark:text-slate-400">
                <li><a href="#features" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Instant Meetings</a></li>
                <li><a href="#features" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Screen Sharing</a></li>
                <li><a href="#features" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Live Speech Captions</a></li>
                <li><a href="#features" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Cloud Recordings</a></li>
                <li><a href="#pricing" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Pricing Plans</a></li>
              </ul>
            </div>

            {/* Col 3: Company */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-4">Company</h4>
              <ul className="space-y-2.5 text-sm text-slate-600 dark:text-slate-400">
                <li><button onClick={() => setActiveModal('about')} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">About Us</button></li>
                <li><button onClick={() => setActiveModal('privacy')} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Privacy Policy</button></li>
                <li><button onClick={() => setActiveModal('terms')} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Terms of Service</button></li>
                <li><button onClick={() => setActiveModal('contact')} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Contact Support</button></li>
              </ul>
            </div>

            {/* Col 4: Platform Security */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-4">Trust & Compliance</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                Built with strict compliance to WebRTC standards, tokenized session access, and zero data selling policies.
              </p>
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300">
                <span className="font-semibold text-slate-900 dark:text-white">Live Infrastructure:</span> XAMPP MySQL + WebRTC Mesh Signaling Engine.
              </div>
            </div>

          </div>

          <div className="pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
            <p>© {new Date().getFullYear()} PulseMeet Inc. All rights reserved.</p>
            <p className="flex items-center gap-1.5">
              Engineered with <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> for modern distributed teams.
            </p>
          </div>
        </div>
      </footer>

      {/* Info Modals */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 relative">
            <button
              onClick={() => { setActiveModal(null); setContactSent(false); }}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            {activeModal === 'privacy' && (
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Privacy Policy</h3>
                <div className="text-sm text-slate-600 dark:text-slate-300 space-y-3 max-h-80 overflow-y-auto pr-2">
                  <p>PulseMeet is dedicated to safeguarding user privacy and personal data. We never sell or monetize your video feeds, chat logs, or contact records.</p>
                  <p><strong>1. Audio & Video Data:</strong> Media streams are transmitted in real-time using secure WebRTC protocols with DTLS-SRTP encryption.</p>
                  <p><strong>2. Cloud Recordings:</strong> Recordings are captured only with explicit host initiation and participant visible notification indicators.</p>
                  <p><strong>3. Data Retention:</strong> Users and administrators maintain the right to delete meetings, participant history, and recordings at any time.</p>
                </div>
              </div>
            )}

            {activeModal === 'terms' && (
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Terms of Service</h3>
                <div className="text-sm text-slate-600 dark:text-slate-300 space-y-3 max-h-80 overflow-y-auto pr-2">
                  <p>By using PulseMeet, you agree to comply with our acceptable use policies.</p>
                  <p><strong>1. Authorized Use:</strong> You agree not to transmit illegal content, disrupt live sessions, or harvest participant credentials.</p>
                  <p><strong>2. Account Security:</strong> You are responsible for safeguarding your login credentials and meeting passcodes.</p>
                  <p><strong>3. Service Availability:</strong> While we guarantee high availability, platform maintenance may occur with prior notice.</p>
                </div>
              </div>
            )}

            {activeModal === 'about' && (
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">About PulseMeet</h3>
                <div className="text-sm text-slate-600 dark:text-slate-300 space-y-3">
                  <p>PulseMeet was engineered as a high-performance, open and customizable alternative to legacy video conferencing tools.</p>
                  <p>Designed with modern web standards including WebRTC, Socket.IO, TypeScript, and React, PulseMeet delivers sub-second latency, rich real-time interactions, and enterprise host moderation.</p>
                </div>
              </div>
            )}

            {activeModal === 'contact' && (
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Contact Support</h3>
                {contactSent ? (
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 rounded-xl text-sm text-center">
                    Thank you! Your support message has been logged. Our engineering team will respond shortly.
                  </div>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      setContactSent(true);
                    }}
                    className="space-y-3"
                  >
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Your Email</label>
                      <input
                        type="email"
                        required
                        placeholder="you@company.com"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Message</label>
                      <textarea
                        rows={3}
                        required
                        placeholder="How can our support team assist you today?"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
                    >
                      Send Message
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
