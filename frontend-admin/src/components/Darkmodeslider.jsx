
export default function DarkModeSwitch() {
  const { user, authTokens, updateDarkMode } = useContext(AuthContext);
  const [toggling, setToggling] = useState(false);

  const isDark = !!user?.darkMode;

  const handleToggle = async () => {
    if (toggling) return;
    setToggling(true);
    await updateDarkMode(!isDark);
    setToggling(false);
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={toggling}
      aria-label="Toggle dark mode"
      className={`relative w-11 h-6 rounded-full transition-colors duration-300 disabled:opacity-60 ${
        isDark ? "bg-[var(--accent)]" : "bg-gray-300"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow flex items-center justify-center transition-transform duration-300 ${
          isDark ? "translate-x-5" : "translate-x-0"
        }`}
      >
        {isDark ? <Moon size={11} className="text-[var(--accent)]" /> : <Sun size={11} className="text-gray-400" />}
      </span>
    </button>
  );
}