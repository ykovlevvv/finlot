'use client';

import { useRef, useState, type FormEvent } from 'react';
import type { AuthService } from '@/lib/authConfig';
import { normalizePhone, requestCallAndAwaitToken } from '@/lib/authApi';

export default function AuthGate({
    service,
    onAuthenticated,
    onClose,
}: {
    service: AuthService;
    onAuthenticated: (token: string) => void;
    onClose: () => void;
}) {
    const [phone, setPhone] = useState('');
    const [callPhonePretty, setCallPhonePretty] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const abortRef = useRef<AbortController | null>(null);
    const checkNowRef = useRef(false);

    const startLogin = async (event?: FormEvent) => {
        event?.preventDefault();
        if (!normalizePhone(phone)) {
            setError('Введите корректный номер телефона');
            return;
        }

        setError(null);
        setLoading(true);
        setCallPhonePretty(null);
        checkNowRef.current = false;
        abortRef.current = new AbortController();

        try {
            const token = await requestCallAndAwaitToken(service, phone, {
                onCallNumber: setCallPhonePretty,
                signal: abortRef.current.signal,
                checkNow: () => {
                    if (!checkNowRef.current) return false;
                    checkNowRef.current = false;
                    return true;
                },
            });
            onAuthenticated(token);
        } catch (cause: any) {
            if (cause?.message === 'aborted') return;
            setError(
                cause?.message === 'expired'
                    ? 'Время проверки истекло. Попробуйте снова.'
                    : cause?.message === 'timeout'
                      ? 'Звонок не подтверждён. Попробуйте снова.'
                      : 'Ошибка авторизации. Попробуйте позже.',
            );
        } finally {
            setLoading(false);
        }
    };

    const close = () => {
        abortRef.current?.abort();
        onClose();
    };

    return (
        <div className="auth-overlay" role="presentation" onClick={close}>
            <section
                className="card auth-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="auth-title"
                onClick={(event) => event.stopPropagation()}
            >
                <button type="button" className="auth-close" aria-label="Закрыть" onClick={close}>×</button>
                <h2 id="auth-title">Вход по номеру телефона</h2>

                {!callPhonePretty ? (
                    <form onSubmit={startLogin}>
                        <p className="auth-text">Для продолжения подтвердите номер звонком.</p>
                        <input
                            className="auth-input"
                            type="tel"
                            inputMode="tel"
                            autoComplete="tel"
                            placeholder="+7 900 000-00-00"
                            value={phone}
                            onChange={(event) => setPhone(event.target.value)}
                            disabled={loading}
                        />
                        {error && <p className="auth-error">{error}</p>}
                        <button type="submit" className="button-primary auth-submit" disabled={loading}>
                            {loading ? 'Проверяем…' : 'Продолжить'}
                        </button>
                        <p className="auth-note">
                            Нажимая «Продолжить», вы соглашаетесь на обработку номера телефона для входа.
                        </p>
                    </form>
                ) : (
                    <div>
                        <p className="auth-text">Позвоните на номер:</p>
                        <a href={`tel:${callPhonePretty}`} className="auth-phone">{callPhonePretty}</a>
                        <p className="auth-note">Мы определим ваш номер автоматически.</p>
                        {error && <p className="auth-error">{error}</p>}
                        <button
                            type="button"
                            className="button-primary auth-submit"
                            onClick={() => { checkNowRef.current = true; }}
                        >
                            {loading ? 'Проверяем…' : 'Позвонил, проверить'}
                        </button>
                    </div>
                )}
            </section>
        </div>
    );
}
