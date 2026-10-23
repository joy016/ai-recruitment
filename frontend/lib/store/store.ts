import { configureStore } from "@reduxjs/toolkit";
import userReducer from "./features/userSlice";
import permissionReducer from "./features/permissionSlice";

/**
 * A new store per call, not a shared singleton — required by the App Router
 * where server-rendered requests must not leak state between users. See
 * app/component/StoreProvider.tsx, which creates one instance per mount.
 */
export const makeStore = () => {
  return configureStore({
    reducer: {
      user: userReducer,
      permissions: permissionReducer,
    },
  });
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
