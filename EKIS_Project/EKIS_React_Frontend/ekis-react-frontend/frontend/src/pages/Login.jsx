import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { login } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import { getApiErrorMessage } from "../api/client";
import { Sparkles } from "lucide-react";

function getToken(data) {
  return data?.access_token;
}

export default function Login() {
  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [state, setState] = useState({
    loading: false,
    error: "",
  });

  const { signIn } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  const submit = async (e) => {
    e.preventDefault();

    setState({
      loading: true,
      error: "",
    });

    try {
      const { data } = await login(form);

      const token = getToken(data);

      if (!token) {
        throw new Error(
          "Login succeeded but no JWT token was returned by the backend."
        );
      }

      signIn(token);

      navigate(
        location.state?.from || "/",
        { replace: true }
      );
    } catch (err) {
      setState({
        loading: false,
        error: getApiErrorMessage(err, "Login failed."),
      });
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">

        <div className="auth-brand">
          <div className="logo-icon">
            <Sparkles size={18} />
          </div>
          <strong>EKIS</strong>
        </div>

        <h1>Welcome back</h1>

        <p className="muted">
          Sign in to your enterprise knowledge workspace.
        </p>

        <form onSubmit={submit} className="auth-form">

          <label>
            Email
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) =>
                setForm({
                  ...form,
                  email: e.target.value,
                })
              }
            />
          </label>

          <label>
            Password
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) =>
                setForm({
                  ...form,
                  password: e.target.value,
                })
              }
            />
          </label>

          {state.error && (
            <div className="form-error">
              {state.error}
            </div>
          )}

          <button
            className="btn-primary full"
            disabled={state.loading}
          >
            {state.loading
              ? "Signing in..."
              : "Sign in"}
          </button>

        </form>

        <p className="auth-footer">
          Don't have an account?{" "}
          <Link to="/register">
            Create one
          </Link>
        </p>

      </div>
    </div>
  );
}