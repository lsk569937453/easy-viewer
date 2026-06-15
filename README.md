# Easy Viewer

<p align="center">
  <strong>A lightweight, all-in-one desktop client for databases, caches, message queues, and object storage.</strong>
</p>

Easy Viewer is a modern data-source management tool inspired by DBeaver, built with [Tauri 2](https://tauri.app/) (a Rust core paired with a React frontend). It bundles a dozen heterogeneous data sources — relational databases, NoSQL stores, message brokers, and object storage — into a single, fast, native desktop app, so you no longer need a different GUI for every backend.

---

## ✨ Highlights

- **One app, many backends** — Connect to 12+ data sources from a unified workspace.
- **Native & lightweight** — Powered by Tauri, the binary is small, fast, and ships with a native window (no Electron overhead).
- **Secure by design** — Connection profiles are stored locally in an embedded SQLite database; credentials never leave your machine.
- **Built-in SQL editor** — Write, parse, and execute SQL with a syntax-highlighted editor.
- **Visual data export** — Dump schema and/or data to SQL, JSON, XML, CSV, or Excel (`.xlsx`).
- **Cross-platform** — Runs on Windows, macOS, and Linux.

## 📦 Supported Data Sources

| Category | Data Source | Capabilities |
| --- | --- | --- |
| **Relational** | MySQL | Browse, query, dump |
| | PostgreSQL | Browse, query, dump |
| | SQLite | Browse, query, dump |
| | SQL Server (MSSQL) | Browse, query, dump |
| | Oracle | Browse, query |
| **Columnar** | ClickHouse | Browse, query |
| **NoSQL** | MongoDB | Browse, query |
| | Redis | Interactive console + key viewer |
| **Search** | Elasticsearch | Index browser, search, settings, ILM |
| **Messaging** | Kafka | Topic & message browser |
| | RocketMQ | Message browser |
| **Storage** | S3 / OSS-compatible | Bucket & file management, upload |

## 🚀 Installation

### Download a pre-built release

1. Go to the [Releases](https://github.com/lsk569937453/easy-viewer/releases) page.
2. Download the installer for your platform (Windows `.exe`/`.msi`, macOS `.dmg`, Linux AppImage/`.deb`).
3. Install and launch — that's it.

### Build from source

Prerequisites:

- [Rust](https://www.rust-lang.org/) (stable toolchain)
- [Node.js](https://nodejs.org/) (v18+)
- [pnpm](https://pnpm.io/)
- Platform build tools (MSVC on Windows, Xcode CLT on macOS, `gcc`/`pkg-config` on Linux)

```bash
# Install frontend dependencies
pnpm install

# Run the app in development mode (hot-reloaded frontend + Rust backend)
pnpm tauri dev

# Build a production bundle for your current OS
pnpm tauri build
```

## 🧭 Usage

### Connecting to a data source

1. Click **New Connection**.
2. Pick the data-source type from the dropdown.
3. Fill in the connection details (host, port, credentials, or a connection URL / file path).
4. **Test** the connection, then **Save** it — it will appear in the sidebar tree.

### What you can do

- **Browse** schemas, tables, and objects in a tree view.
- **Run queries** in the built-in SQL editor and inspect results in a virtualized table.
- **Redis console** — execute commands interactively and inspect key details.
- **Message browsing** — view Kafka topics and RocketMQ messages.
- **Elasticsearch** — search documents and inspect index settings, templates, and ILM policies.
- **S3 / OSS** — create buckets, manage files, and upload with progress tracking.
- **Export data** — dump structure and/or data to SQL / JSON / XML / CSV / Excel.

### Video walkthrough

For a guided tour of the features, watch the [video documentation](https://youtu.be/z759ab5_xO0).

## 🛠 Tech Stack

**Frontend** — React 19, Vite 7, TailwindCSS 4, DaisyUI, TanStack Table & Virtual, ECharts, React Arborist, React Syntax Highlighter.

**Backend** — Rust, Tauri 2, SQLx, tiberius (MSSQL), oracle, redis, mongodb, clickhouse, elasticsearch, rdkafka, rocketmq, aws-sdk-s3.

**Config storage** — Embedded SQLite.

## 🤝 Contributing

Contributions are welcome!

1. **Fork** the repository.
2. Create a feature branch (`git checkout -b feature/my-feature`).
3. Commit your changes and open a **Pull Request**.

Please open an issue first to discuss substantial changes.

## 📄 License

Easy Viewer is licensed under the [Apache License 2.0](./LICENSE).

## 💬 Support

If you run into a bug or have a feature request, please [open an issue](https://github.com/lsk569937453/easy-viewer/issues).

## 🙏 Acknowledgements

Built on the shoulders of giants — special thanks to the [Tauri](https://tauri.app/) team and the authors of the many open-source crates and libraries that power Easy Viewer.
