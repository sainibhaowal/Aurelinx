import { APP_VERSION } from "../config/version";

const AurelinxLogo = ({ size = 24, collapsed = false, showVersion = true }) => {
  return (
    <div
      className={`flex items-center ${collapsed ? "justify-center" : "gap-3"}`}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="inline-flex items-center justify-center overflow-hidden rounded-xl"
        style={{ width: size + 10, height: size + 10 }}
      >
        <img
          src="/aurelinx-logo-4k.svg"
          alt="Aurelinx Logo"
          style={{ width: "120%", height: "120%", objectFit: "contain" }}
        />
      </motion.div>

      {!collapsed && (
        <div className="flex items-center gap-2">
          <motion.span
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-2xl font-extrabold tracking-tight text-cyan-300"
          >
            Aurelinx
          </motion.span>
          {showVersion && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-md border border-emerald-400/30 bg-emerald-950/40 px-1.5 py-0.5 text-[10px] font-mono font-bold tracking-wider text-emerald-300"
            >
              v{APP_VERSION}
            </motion.span>
          )}
        </div>
      )}
    </div>
  );
};

export default AurelinxLogo;
