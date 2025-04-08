# chatterbots-backend

### Local Development

- `nvm use`
- `npm install`
- `pre-commit install` to install hooks
- Install the Pip3 package `xmlformatter` i.e. `pip3 install xmlformatter`
- Run this to exec all the pre-commit hooks on the entire project: `pre-commit run --all-files`
- `npx prisma generate`
- `npm run serve`

### Prisma migrations

- Whenever the `schema.prisma` file changes, a new migration needs to be generated, e.g. `npx prisma migrate dev --name added_new_thingy`
