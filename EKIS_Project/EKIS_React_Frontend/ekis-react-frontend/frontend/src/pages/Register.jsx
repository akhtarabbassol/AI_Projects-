import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../api/auth";
import { Sparkles } from "lucide-react";
import { getApiErrorMessage } from "../api/client";

export default function Register() {
  const [form, setForm] = useState({
    company_name: "",
    full_name: "",
    email: "",
    password: "",
  });

  const [state, setState] = useState({
    loading: false,
    error: "",
    success: "",
  });

  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();

    setState({
      loading: true,
      error: "",
      success: "",
    });

    try {
      const { data } = await register(form);

      if (!data?.access_token) {
        throw new Error(
          "Registration succeeded but no JWT token was returned by the backend."
        );
      }

      setState({
        loading: false,
        error: "",
        success: "Registration successful. You can now sign in.",
      });

      setTimeout(() => {
        navigate("/login");
      }, 700);
    } catch (err) {
      setState({
        loading: false,
        error: getApiErrorMessage(err, "Registration failed."),
        success: "",
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

        <h1>Create account</h1>

        <p className="muted">
          Register a new EKIS company account.
        </p>

        <form onSubmit={submit} className="auth-form">

          <label>
            Company name
            <input
              required
              value={form.company_name}
              onChange={(e) =>
                setForm({
                  ...form,
                  company_name: e.target.value,
                })
              }
            />
          </label>

          <label>
            Full name
            <input
              required
              value={form.full_name}
              onChange={(e) =>
                setForm({
                  ...form,
                  full_name: e.target.value,
                })
              }
            />
          </label>

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
              minLength={8}
              maxLength={128}
              value={form.password}
              onChange={(e) =>
                setForm({
                  ...form,
                  password: e.target.value,
                })
              }
            />
          </label>

          <p className="muted">
            Password must contain at least 8 characters,
            one uppercase letter, one digit, and one special character.
          </p>

          {state.error && (
            <div className="form-error">
              {state.error}
            </div>
          )}

          {state.success && (
            <div className="form-success">
              {state.success}
            </div>
          )}

          <button
            className="btn-primary full"
            disabled={state.loading}
          >
            {state.loading
              ? "Creating..."
              : "Create account"}
          </button>
        </form>

        <p className="auth-footer">
          Already registered?{" "}
          <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}