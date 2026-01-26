"use client";

import { motion } from "framer-motion";

// Client/Partner logos data - Companies using Posty
const LOGOS = [
  { name: "Startup Studio", type: "Incubateur" },
  { name: "Growth Agency", type: "Agence Marketing" },
  { name: "Tech Consult", type: "Consulting IT" },
  { name: "Digital Boost", type: "Agence Digitale" },
  { name: "Scale Partners", type: "Cabinet Conseil" },
  { name: "Innovate Hub", type: "Startup Studio" },
];

interface ClientLogosProps {
  className?: string;
  title?: string;
  subtitle?: string;
}

export default function ClientLogos({
  className = "",
  title = "Utilisé par des équipes de",
  subtitle = "+2,000 entrepreneurs font confiance à Posty",
}: ClientLogosProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={`py-12 ${className}`}
    >
      {/* Title */}
      <div className="text-center mb-8">
        <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">
          {title}
        </p>
        <p className="text-xs text-gray-400">
          {subtitle}
        </p>
      </div>

      {/* Logos Grid */}
      <div className="max-w-5xl mx-auto px-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6 items-center justify-items-center">
          {LOGOS.map((logo, index) => (
            <motion.div
              key={logo.name}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.4 }}
              whileHover={{ scale: 1.05 }}
              className="group flex flex-col items-center gap-2 px-4 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-dark-hover transition-all duration-200"
            >
              {/* Placeholder Logo */}
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 dark:from-dark-card dark:to-dark-bg border border-gray-200 dark:border-dark-border flex items-center justify-center shadow-sm group-hover:shadow-md group-hover:border-primary/30 transition-all duration-200">
                <span className="text-lg font-bold text-gray-400 dark:text-text-muted group-hover:text-primary transition-colors">
                  {logo.name.charAt(0)}
                </span>
              </div>
              {/* Company Name */}
              <div className="text-center">
                <p className="text-xs font-medium text-gray-700 dark:text-text-secondary group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                  {logo.name}
                </p>
                <p className="text-[10px] text-gray-400 dark:text-text-muted">
                  {logo.type}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Bottom Stats */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="flex flex-wrap justify-center gap-8 mt-10 text-center"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">50K+</p>
            <p className="text-xs text-gray-500 dark:text-text-muted">Posts générés</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
            </svg>
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">2,000+</p>
            <p className="text-xs text-gray-500 dark:text-text-muted">Utilisateurs actifs</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">+340%</p>
            <p className="text-xs text-gray-500 dark:text-text-muted">Visibilité moyenne</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
