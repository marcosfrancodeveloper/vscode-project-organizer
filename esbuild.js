const esbuild = require("esbuild");

const args = process.argv.slice(2);
const watch = args.includes("--watch");

async function main() {
  const ctx = await esbuild.context({
    entryPoints: ["src/extension.ts"],
    bundle: true,
    format: "cjs",
    minify: !watch,
    sourcemap: true,
    sourcesContent: false,
    platform: "node",
    target: "node18",
    outfile: "dist/extension.js",
    external: ["vscode"],
    logLevel: "info",
  });

  if (watch) {
    console.log("Iniciando monitoramento de arquivos (modo watch)...");
    await ctx.watch();
  } else {
    await ctx.rebuild();
    await ctx.dispose();
    console.log("Build concluído com sucesso!");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
