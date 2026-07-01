import React, { useState, useEffect } from 'react';
import { Facebook, Instagram, Mail } from 'lucide-react'; 
import api from "../api";
import FAQModal from "./FAQModal";
import ScrollToTop from "./ScrollToTop";

// Custom X (formerly Twitter) SVG Icon
const XIcon = ({ size = 24, className = "" }) => (
    <svg 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="currentColor" 
        className={className}
    >
        <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
    </svg>
);

const Footer = () => {
    const [config, setConfig] = useState(null);
    const [isFaqOpen, setIsFaqOpen] = useState(false);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const res = await api.get("/api/site-info/"); 
                setConfig(res.data);
            } catch (err) {
                console.error("Footer config error:", err);
            }
        };
        fetchConfig();
    }, []);

    if (!config) return <footer className="p-10 text-center bg-gray-900 text-white">Loading...</footer>;

    return (
        <>
            <footer className="bg-gray-900 text-white py-12 mt-auto border-t border-gray-800">
                <div className="container mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-10">
                    
                    {/* Branding */}
                    <div className="space-y-4 text-center md:text-left">
                        <h2 className="text-2xl font-bold text-blue-400">{config.website_name}</h2>
                        <p className="text-gray-400 text-sm leading-relaxed max-w-xs mx-auto md:mx-0">
                            {config.about_us}
                        </p>
                    </div>

                    {/* Support & Contact */}
                    <div className="text-center md:text-left">
                        <h3 className="text-lg font-semibold mb-4 uppercase tracking-wider text-gray-500 text-xs">Support</h3>
                        <ul className="space-y-3 text-gray-400 text-sm">
                            <li>
                                <button 
                                    onClick={() => setIsFaqOpen(true)} 
                                    className="hover:text-blue-400 transition-colors underline decoration-gray-700 underline-offset-4"
                                >
                                    Frequently Asked Questions
                                </button>
                            </li>
                            <li className="flex items-center justify-center md:justify-start gap-2">
                                <Mail size={16} className="text-blue-400" />
                                <span>{config.contact_email}</span>
                            </li>
                            <li className="flex items-center justify-center md:justify-start gap-2">
                                <span><a href="/information">Information</a></span>
                            </li>
                        </ul>
                    </div>

                    {/* Social Media Icons */}
                    <div className="text-center md:text-left">
                        <h3 className="text-lg font-semibold mb-4 uppercase tracking-wider text-gray-500 text-xs">Follow Us</h3>
                        <div className="flex justify-center md:justify-start gap-6">
                            {config.facebook_url && (
                                <a href={config.facebook_url} target="_blank" rel="noreferrer" 
                                   className="text-gray-400 hover:text-blue-600 transition-all transform hover:-translate-y-1">
                                    <Facebook size={22} />
                                </a>
                            )}
                            {config.twitter_url && (
                                <a href={config.twitter_url} target="_blank" rel="noreferrer" 
                                   className="text-gray-400 hover:text-white transition-all transform hover:-translate-y-1">
                                    <XIcon size={20} />
                                </a>
                            )}
                            {config.instagram_url && (
                                <a href={config.instagram_url} target="_blank" rel="noreferrer" 
                                   className="text-gray-400 hover:text-pink-500 transition-all transform hover:-translate-y-1">
                                    <Instagram size={22} />
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="container mx-auto px-6 mt-10 pt-6 border-t border-gray-800 text-center text-gray-500 text-xs">
                    © {new Date().getFullYear()} {config.website_name}. All rights reserved.
                </div>
            </footer>

            <FAQModal isOpen={isFaqOpen} onClose={() => setIsFaqOpen(false)} />
            <ScrollToTop />
        </>
    );
};

export default Footer;