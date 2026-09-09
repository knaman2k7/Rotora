# React + Vite

## Employee constraints API

The server exposes CRUD endpoints for the two employee constraint tables. The
`constraint` value must be a JSON integer matrix such as `[[1, 0], [0, 1]]`.

### Default constraints

- `GET /api/defaultEmployeeConstraints/:id`
- `POST /api/defaultEmployeeConstraints` with `{ "id": 1, "constraint": [[1, 0]] }`
- `PUT /api/defaultEmployeeConstraints/:id` with `{ "constraint": [[1, 0]] }`
- `DELETE /api/defaultEmployeeConstraints/:id`

### Week-specific constraints

- `GET /api/specificEmployeeConstraints/:id`
- `POST /api/specificEmployeeConstraints` with `{ "id": 1, "weekNo": 34, "constraint": [[1, 0]] }`
- `PUT /api/specificEmployeeConstraints/:id/:weekNo` with `{ "constraint": [[1, 0]] }`
- `DELETE /api/specificEmployeeConstraints/:id/:weekNo`

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
