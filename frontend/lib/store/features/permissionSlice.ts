import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getAllPermissions } from "@/lib/api/permissions";
import { clearUser } from "./userSlice";

export type PermissionStatus = "idle" | "loading" | "succeeded" | "failed";

export interface PermissionState {
  /** Granted permission names, e.g. "candidates.view". */
  names: string[];
  /** Role the names belong to; anything else is treated as stale. */
  roleId: number | null;
  status: PermissionStatus;
  lastLoadedAt: number | null;
}

const initialState: PermissionState = {
  names: [],
  roleId: null,
  status: "idle",
  lastLoadedAt: null,
};

type PermissionRootState = { permissions: PermissionState };

export const fetchPermissions = createAsyncThunk<
  { roleId: number; names: string[] },
  number,
  { state: PermissionRootState }
>(
  "permissions/fetch",
  async (roleId) => {
    const permissions = await getAllPermissions(roleId);
    const names = (permissions ?? [])
      // Only keep rows for the requested role, in case the API ignores the filter.
      .filter((permission) => permission.roleId === roleId)
      .map((permission) => permission.permissionName.trim());
    return { roleId, names: [...new Set(names)] };
  },
  {
    // One request at a time per role.
    condition: (roleId, { getState }) => {
      const { status, roleId: loadingRoleId } = getState().permissions;
      return !(status === "loading" && loadingRoleId === roleId);
    },
  },
);

const permissionSlice = createSlice({
  name: "permissions",
  initialState,
  reducers: {
    resetPermissions: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPermissions.pending, (state, action) => {
        // A different role must never see the previous role's permissions.
        if (state.roleId !== action.meta.arg) {
          state.names = [];
        }
        state.roleId = action.meta.arg;
        state.status = "loading";
      })
      .addCase(fetchPermissions.fulfilled, (state, action) => {
        if (state.roleId !== action.payload.roleId) return;
        state.names = action.payload.names;
        state.status = "succeeded";
        state.lastLoadedAt = Date.now();
      })
      .addCase(fetchPermissions.rejected, (state, action) => {
        if (state.roleId !== action.meta.arg) return;
        // Deny by default: a failed load never leaves old access in place.
        state.names = [];
        state.status = "failed";
      })
      .addCase(clearUser, () => initialState);
  },
});

export const { resetPermissions } = permissionSlice.actions;
export default permissionSlice.reducer;
