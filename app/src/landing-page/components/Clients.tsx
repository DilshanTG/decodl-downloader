export default function Clients() {
  const providers = [
    { name: "Shutterstock", color: "text-red-500 dark:text-red-400" },
    { name: "Freepik", color: "text-cyan-500 dark:text-cyan-400" },
    { name: "Adobe Stock", color: "text-red-600 dark:text-red-500" },
    { name: "Envato Elements", color: "text-green-500 dark:text-green-400" },
    { name: "iStock Photo", color: "text-blue-500 dark:text-blue-400" },
    { name: "Flaticon", color: "text-indigo-500 dark:text-indigo-400" },
  ];

  return (
    <div className="mx-auto mt-20 flex max-w-7xl flex-col items-center gap-y-6 px-6 lg:px-8">
      <h2 className="text-muted-foreground text-center text-xs uppercase font-bold tracking-widest">
        SUPPORTED PREMIUM ASSET PROVIDERS:
      </h2>

      <div className="mx-auto flex flex-wrap items-center justify-center gap-x-12 gap-y-8 max-w-4xl">
        {providers.map((p) => (
          <div
            key={p.name}
            className="flex items-center justify-center font-extrabold text-xl md:text-2xl tracking-tight opacity-60 dark:opacity-50 grayscale contrast-125 transition-all duration-300 hover:opacity-100 hover:grayscale-0 cursor-default"
          >
            <span className={p.color}>{p.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
