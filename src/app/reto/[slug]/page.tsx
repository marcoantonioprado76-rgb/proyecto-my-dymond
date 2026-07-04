'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import {
  Gem,
  User,
  Smartphone,
  Mail,
  Globe,
  Building2,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

type RetoInfo = { name: string; open: boolean };

type LoadState =
  | { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'closed'; name: string }
  | { status: 'ready'; name: string };

const BRAND_GRADIENT = 'linear-gradient(135deg,#FF2D95,#B735B8,#233B8F)';

const COUNTRIES = [
  'Bolivia',
  'Argentina',
  'Chile',
  'Perú',
  'Colombia',
  'Ecuador',
  'México',
  'España',
  'Estados Unidos',
  'Paraguay',
  'Uruguay',
  'Venezuela',
  'Brasil',
  'Otro',
];

export default function Page({ params }: { params: { slug: string } }) {
  const { slug } = params;

  const [load, setLoad] = useState<LoadState>({ status: 'loading' });

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ fullName?: boolean; phone?: boolean }>({});
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let active = true;
    setLoad({ status: 'loading' });

    (async () => {
      try {
        const res = await fetch(`/api/reto/${slug}`);
        if (!active) return;

        if (res.status === 404) {
          setLoad({ status: 'not-found' });
          return;
        }

        if (!res.ok) {
          setLoad({ status: 'not-found' });
          return;
        }

        const data = (await res.json()) as RetoInfo;
        if (!active) return;

        if (!data || data.open === false) {
          setLoad({ status: 'closed', name: data?.name ?? '' });
          return;
        }

        setLoad({ status: 'ready', name: data.name });
      } catch {
        if (active) setLoad({ status: 'not-found' });
      }
    })();

    return () => {
      active = false;
    };
  }, [slug]);

  const retoName =
    load.status === 'ready' || load.status === 'closed'
      ? load.name || 'Reto 90 Días'
      : 'Reto 90 Días';

  function resetForm() {
    setFullName('');
    setPhone('');
    setEmail('');
    setCountry('');
    setCity('');
    setError(null);
    setFieldErrors({});
    setSuccess(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const nextFieldErrors: { fullName?: boolean; phone?: boolean } = {};
    if (!fullName.trim()) nextFieldErrors.fullName = true;
    if (!phone.trim()) nextFieldErrors.phone = true;

    if (nextFieldErrors.fullName || nextFieldErrors.phone) {
      setFieldErrors(nextFieldErrors);
      setError('Por favor completa tu nombre y tu número de celular.');
      return;
    }

    setFieldErrors({});
    setSubmitting(true);

    try {
      const res = await fetch(`/api/reto/${slug}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          country,
          city: city.trim(),
        }),
      });

      let payload: { ok?: boolean; error?: string } = {};
      try {
        payload = await res.json();
      } catch {
        payload = {};
      }

      if (!res.ok || !payload.ok) {
        setError(payload.error || 'No se pudo completar el registro. Intenta de nuevo.');
        return;
      }

      setSuccess(true);
    } catch {
      setError('Error de conexión. Verifica tu internet e intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={styles.page}>
      <div style={styles.borderGlow}>
        <div style={styles.card}>
          {load.status === 'loading' && (
            <div style={styles.centerState}>
              <Loader2 size={36} color="#FF2D95" style={{ animation: 'reto-spin 1s linear infinite' }} />
              <p style={styles.stateText}>Cargando…</p>
            </div>
          )}

          {load.status === 'not-found' && (
            <div style={styles.centerState}>
              <Gem size={40} color="#B735B8" style={styles.diamondGlow} />
              <h1 style={styles.stateTitle}>Reto no encontrado</h1>
              <p style={styles.stateText}>
                El enlace no corresponde a ningún reto activo. Verifica que sea correcto.
              </p>
            </div>
          )}

          {load.status === 'closed' && (
            <div style={styles.centerState}>
              <Gem size={40} color="#B735B8" style={styles.diamondGlow} />
              <h1 style={styles.stateTitle}>{retoName}</h1>
              <p style={styles.stateText}>El registro está cerrado por ahora.</p>
            </div>
          )}

          {load.status === 'ready' && success && (
            <div style={styles.centerState}>
              <CheckCircle2 size={56} color="#22C55E" style={styles.successGlow} />
              <h1 style={styles.stateTitle}>¡Registro completado! 🎉</h1>
              <p style={styles.retoNameSuccess}>{retoName}</p>
              <p style={styles.stateText}>Pronto recibirás información por WhatsApp.</p>
              <button type="button" style={styles.secondaryBtn} onClick={resetForm}>
                Registrar a otra persona
              </button>
            </div>
          )}

          {load.status === 'ready' && !success && (
            <>
              <div style={styles.header}>
                <div style={styles.iconWrap}>
                  <Gem size={40} color="#FF2D95" style={styles.diamondGlow} />
                </div>
                <h1 style={styles.title}>
                  <span style={styles.gradientText}>{retoName}</span>
                </h1>
                <p style={styles.subtitle}>Completa tus datos para comenzar</p>
              </div>

              {error && <div style={styles.errorBanner}>{error}</div>}

              <form onSubmit={handleSubmit} noValidate style={styles.form}>
                <Field label="Nombre">
                  <InputWithIcon
                    icon={<User size={18} color="#6B7280" />}
                    invalid={fieldErrors.fullName}
                  >
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ingresa tu nombre"
                      style={styles.input}
                      autoComplete="name"
                    />
                  </InputWithIcon>
                </Field>

                <Field label="Celular">
                  <InputWithIcon
                    icon={<Smartphone size={18} color="#6B7280" />}
                    invalid={fieldErrors.phone}
                  >
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Ingresa tu número de celular"
                      style={styles.input}
                      autoComplete="tel"
                      inputMode="tel"
                    />
                  </InputWithIcon>
                </Field>

                <Field label="Correo">
                  <InputWithIcon icon={<Mail size={18} color="#6B7280" />}>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Ingresa tu correo electrónico"
                      style={styles.input}
                      autoComplete="email"
                      inputMode="email"
                    />
                  </InputWithIcon>
                </Field>

                <div style={styles.row}>
                  <div style={styles.rowCol}>
                    <Field label="País">
                      <InputWithIcon icon={<Globe size={18} color="#6B7280" />}>
                        <select
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          style={{
                            ...styles.input,
                            ...styles.select,
                            color: country ? '#FFFFFF' : '#6B7280',
                          }}
                        >
                          <option value="" disabled style={styles.option}>
                            Selecciona tu país
                          </option>
                          {COUNTRIES.map((c) => (
                            <option key={c} value={c} style={styles.option}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </InputWithIcon>
                    </Field>
                  </div>

                  <div style={styles.rowCol}>
                    <Field label="Ciudad">
                      <InputWithIcon icon={<Building2 size={18} color="#6B7280" />}>
                        <input
                          type="text"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="Ingresa tu ciudad"
                          style={styles.input}
                          autoComplete="address-level2"
                        />
                      </InputWithIcon>
                    </Field>
                  </div>
                </div>

                <button type="submit" style={styles.submitBtn} disabled={submitting}>
                  {submitting ? (
                    <span style={styles.btnInner}>
                      <Loader2
                        size={20}
                        color="#FFFFFF"
                        style={{ animation: 'reto-spin 1s linear infinite' }}
                      />
                      Registrando…
                    </span>
                  ) : (
                    'REGISTRARSE'
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes reto-spin { to { transform: rotate(360deg); } }
        input::placeholder { color: #6B7280; }
        select:focus, input:focus { outline: none; }
      `}</style>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={styles.field}>
      <span style={styles.label}>{label}</span>
      {children}
    </label>
  );
}

function InputWithIcon({
  icon,
  invalid,
  children,
}: {
  icon: React.ReactNode;
  invalid?: boolean;
  children: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={() => setFocused(false)}
      style={{
        ...styles.inputWrap,
        borderColor: invalid ? '#EF4444' : focused ? '#FF2D95' : '#2A2E45',
        boxShadow: focused ? '0 0 0 3px rgba(255,45,149,0.18)' : 'none',
      }}
    >
      <span style={styles.inputIcon}>{icon}</span>
      {children}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: '100vh',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
    boxSizing: 'border-box',
    background:
      'radial-gradient(1200px 600px at 50% -10%, rgba(255,45,149,0.10), transparent 60%),' +
      'radial-gradient(900px 600px at 50% 110%, rgba(35,59,143,0.18), transparent 60%),' +
      '#0A0A12',
    color: '#FFFFFF',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
  borderGlow: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 24,
    padding: 1.5,
    background: BRAND_GRADIENT,
    boxShadow: '0 0 40px rgba(255,45,149,0.25), 0 0 80px rgba(35,59,143,0.25)',
  },
  card: {
    background: 'rgba(14,17,32,0.96)',
    borderRadius: 22.5,
    padding: '32px 24px',
    boxSizing: 'border-box',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    marginBottom: 24,
  },
  iconWrap: {
    marginBottom: 14,
    display: 'flex',
  },
  diamondGlow: {
    filter: 'drop-shadow(0 0 12px rgba(255,45,149,0.7))',
  },
  successGlow: {
    filter: 'drop-shadow(0 0 14px rgba(34,197,94,0.6))',
    marginBottom: 6,
  },
  title: {
    fontSize: 30,
    lineHeight: 1.15,
    fontWeight: 800,
    margin: 0,
  },
  gradientText: {
    background: BRAND_GRADIENT,
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    color: 'transparent',
  },
  subtitle: {
    marginTop: 10,
    marginBottom: 0,
    color: '#9AA0B4',
    fontSize: 15,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 7,
  },
  label: {
    fontSize: 13.5,
    fontWeight: 600,
    color: '#FFFFFF',
  },
  inputWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: '#0B0E1A',
    border: '1px solid #2A2E45',
    borderRadius: 12,
    padding: '0 12px',
    height: 50,
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
  },
  inputIcon: {
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
  },
  input: {
    flex: 1,
    width: '100%',
    minWidth: 0,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#FFFFFF',
    fontSize: 15,
    height: '100%',
    padding: 0,
    fontFamily: 'inherit',
  },
  select: {
    appearance: 'none',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
    cursor: 'pointer',
  },
  option: {
    background: '#0E1120',
    color: '#FFFFFF',
  },
  row: {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
  },
  rowCol: {
    flex: '1 1 180px',
    minWidth: 0,
  },
  submitBtn: {
    marginTop: 6,
    width: '100%',
    border: 'none',
    borderRadius: 14,
    padding: '15px 16px',
    background: BRAND_GRADIENT,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 800,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    cursor: 'pointer',
    boxShadow: '0 8px 24px rgba(255,45,149,0.30)',
    fontFamily: 'inherit',
  },
  btnInner: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  secondaryBtn: {
    marginTop: 18,
    borderRadius: 12,
    padding: '12px 20px',
    background: 'transparent',
    border: '1px solid #2A2E45',
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  errorBanner: {
    background: 'rgba(239,68,68,0.12)',
    border: '1px solid rgba(239,68,68,0.45)',
    color: '#FCA5A5',
    borderRadius: 12,
    padding: '12px 14px',
    fontSize: 13.5,
    marginBottom: 16,
  },
  centerState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    gap: 10,
    padding: '20px 4px',
  },
  stateTitle: {
    fontSize: 22,
    fontWeight: 800,
    margin: 0,
  },
  retoNameSuccess: {
    margin: 0,
    fontSize: 16,
    fontWeight: 700,
    background: BRAND_GRADIENT,
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    color: 'transparent',
  },
  stateText: {
    margin: 0,
    color: '#9AA0B4',
    fontSize: 15,
    lineHeight: 1.5,
  },
};
