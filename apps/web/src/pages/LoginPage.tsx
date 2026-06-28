import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, Navigate } from "react-router-dom";
import { authClient } from "../lib/auth-client";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  if (isPending) return null;
  if (session) return <Navigate to="/" replace />;

  async function onSubmit(data: FormData) {
    const { error } = await authClient.signIn.email(data);
    if (error) {
      setError("root", { message: error.message ?? "Invalid email or password" });
    } else {
      navigate("/");
    }
  }

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-logo">H</div>
        <h1>Welcome back</h1>
        <p className="login-subtitle">Sign in to your Helpdesk account</p>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="field">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              autoFocus
              className={errors.email ? "invalid" : ""}
              {...register("email")}
            />
            {errors.email && <span className="field-error">{errors.email.message}</span>}
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              className={errors.password ? "invalid" : ""}
              {...register("password")}
            />
            {errors.password && <span className="field-error">{errors.password.message}</span>}
          </div>
          <button className="btn-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Signing in…" : "Sign in"}
          </button>
          {errors.root && (
            <div className="error-box">
              <span>⚠</span> {errors.root.message}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
