# Lexstash

**Lexstash** is a modular, local-first prompt builder designed for the agentic age. It allows you to visually construct, organize, and compile complex LLM prompts using a drag-and-drop interface.

[![Deploy to GitHub Pages](https://github.com/benjipeng/lexstash/actions/workflows/deploy.yml/badge.svg)](https://github.com/benjipeng/lexstash/actions/workflows/deploy.yml)

![Lexstash Preview](public/og-image.png)

## ✨ Features

- **Visual Builder**: Drag-and-drop interface to assemble prompts from text blocks, containers, and references.
- **Modular Design**: Create reusable prompt components and reference them in other prompts to avoid repetition.
- **Nested Logic**: deeply nested containers for complex prompt structures.
- **Variable Support**: Define variables using `{{variable}}` syntax for dynamic prompt generation.
- **Local-First**: All data is stored locally in your browser using IndexedDB (via Dexie.js). No server required.
- **Export Options**: Copy your compiled prompts as raw text or cURL commands.
- **Customizable UI**: Light/Dark mode support with multiple color themes (Azure, Amethyst, Emerald, Sunset).
- **Mobile Responsive**: Fully functional on mobile devices with a touch-friendly drawer interface.

## 🛠️ Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **State/Storage**: [Dexie.js](https://dexie.org/) (IndexedDB wrapper)
- **Drag & Drop**: [dnd-kit](https://dndkit.com/)
- **Icons**: [Lucide React](https://lucide.dev/)

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed.

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/benjipeng/lexstash.git
    cd lexstash
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Run the development server:
    ```bash
    npm run dev
    ```

4.  Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📖 Usage

1.  **Create a Prompt**: Click the "+" icon in the sidebar or the "New Prompt" button.
2.  **Add Blocks**: Use the toolbar to add **Text**, **Container**, or **Reference** blocks.
3.  **Organize**: Drag and drop blocks to reorder or nest them inside containers.
4.  **Variables**: Insert variables like `{{user_name}}` in your text blocks.
5.  **Preview & Export**: Click the "Preview" (eye icon) button to see the compiled output and copy it to your clipboard.

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
