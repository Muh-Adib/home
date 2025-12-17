import { motion } from "framer-motion";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-350 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="relative flex items-center justify-center">

        {/* Ripple circle */}
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute w-24 h-24 rounded-full border border-blue-500/30"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{
              scale: [0.8, 1.6],
              opacity: [0.6, 0],
            }}
            transition={{
              duration: 2.4,
              repeat: Infinity,
              ease: "easeOut",
              delay: i * 0.6,
            }}
          />
        ))}

        {/* Logo container */}
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: [0.9, 1, 0.9] }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="relative z-10 flex items-center justify-center w-16 h-16 rounded-full bg-background/95 backdrop-blur-sm shadow-lg"
        >
          <img
            src="/logo.svg"
            alt="Loading"
            className="w-8 h-8 object-contain"
          />
        </motion.div>

      </div>
    </div>
  );
}
