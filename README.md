# Rapidsoft Flow

Editor de fluxogramas de faturamento (Consistem Flow). Stack: HTML/JS + React/Vite.

## Requisitos

- [Node.js](https://nodejs.org/) 18+

## Rodar localmente

```bash
git clone https://github.com/LuanElizeuSantos/rapidsoft-flow.git
cd rapidsoft-flow

npm install
npm run dev
```

Abre em **http://localhost:5173/index.html** (menu principal). Diagrama: **/fluxo.html**.

## Salvar e versionar o fluxo

Em `npm run dev`, o app lê e grava automaticamente em:

```
data/consistem-flow-config.json
```

Para enviar alterações ao Git:

```bash
git add data/consistem-flow-config.json
git commit -m "Atualiza fluxo"
git push
```

Para pegar o fluxo de outra máquina:

```bash
git pull
npm run dev
```

> Em `npm run build` / produção não há API de arquivo — só `localStorage` do navegador.

## Outros comandos

| Comando | O que faz |
|---------|-----------|
| `npm run build` | Gera `dist/` para deploy |
| `npm run preview` | Serve o build localmente |
| `npm run test:store` | Testes da lógica de fluxo |

## Estrutura rápida

| Pasta/arquivo | Conteúdo |
|---------------|----------|
| `js/store.js` | Estado, regras, persistência |
| `src/` | Diagrama React (XYFlow) |
| `data/consistem-flow-config.json` | Fluxo versionado |
| `test/` | Cenários e testes automatizados |
