import { uploadRouter } from "./upload.ts";

import { Router } from "../deps.ts";
import { healthRouter } from "./health.ts";
import { todosRouter } from "./todos.ts";
import { authRouter } from "./auth.ts";
import { usersRouter } from "./users.ts";
import { productsRouter } from "./products.ts";
import { bootstrapRouter } from "./bootstrap.ts";
import { forgotPasswordRouter } from "./forgotPassword.ts";

export const api = new Router();
api.use(uploadRouter.routes(), uploadRouter.allowedMethods());
api.use(healthRouter.routes(), healthRouter.allowedMethods());
api.use(todosRouter.routes(), todosRouter.allowedMethods());
api.use(authRouter.routes(), authRouter.allowedMethods());
api.use(usersRouter.routes(), usersRouter.allowedMethods());
api.use(productsRouter.routes(), productsRouter.allowedMethods());
api.use(bootstrapRouter.routes(), bootstrapRouter.allowedMethods());
api.use(forgotPasswordRouter.routes(), forgotPasswordRouter.allowedMethods());
