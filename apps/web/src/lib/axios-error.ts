import axios from "axios";

/** Extracts the `{ error }` message from a failed mutation's axios error, if present. */
export function axiosErrorMessage(error: unknown): string | undefined {
  return axios.isAxiosError(error)
    ? (error.response?.data as { error?: string } | undefined)?.error
    : undefined;
}
