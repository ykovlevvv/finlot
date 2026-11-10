'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Icon from '@/components/Icon';
import type { AuthService } from '@/lib/authConfig';
import {
    awaitCallToken,
    clearPendingCall,
    getPendingCall,
    getToken,
    initCall,
    normalizePhone,
    savePendingCall,
} from '@/lib/authApi';

/**
 * phone     — ввод номера;
 * call      — номер для звонка и кнопки «Позвонить» / «Копировать»;
 * verifying — человек вернулся после звонка, ждём подтверждения SMS.ru (обычно 5–7 с);
 * stalled   — подтверждения нет дольше STALL_MS: предлагаем проверить ещё раз или перезвонить;
 * success   — номер подтверждён, короткая пауза с галочкой перед переходом.
 */
type Phase = 'phone' | 'call' | 'verifying' | 'stalled' | 'success';

const STALL_MS = 15_000;
const SUCCESS_PAUSE_MS = 700;

export default function AuthGate({
    service,
    appIcon,
    onAuthenticated,
    onClose,
}: {
    service: AuthService;
    appIcon?: string;
    onAuthenticated: (token: string) => void;
    onClose: () => void;
}) {
    const [phase, setPhase] = useState<Phase>('phone');
    const [phone, setPhone] = useState('');
    const [callPhonePretty, setCallPhonePretty] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const abortRef = useRef<AbortController | null>(null);
    const checkNowRef = useRef(false);
    const phaseRef = useRef<Phase>('phone');
    /** Человек нажал «Позвонить» или скопировал номер — значит, ушёл звонить. */
    const leftToCallRef = useRef(false);
    const checkIdRef = useRef<string | null>(null);
    const pollingRef = useRef(false);

    const goTo = (next: Phase) => {
        phaseRef.current = next;
        setPhase(next);
    };

    const startVerifying = () => {
        setError(null);
        checkNowRef.current = true;
        goTo('verifying');
        // Опрос мог завершиться на ошибке сети — перезапускаем по той же проверке.
        if (!pollingRef.current && checkIdRef.current) void awaitToken(checkIdRef.current);
    };

    // Ждём подтверждения: через STALL_MS без ответа переводим в «stalled».
    useEffect(() => {
        if (phase !== 'verifying') return;
        const timer = window.setTimeout(() => {
            if (phaseRef.current === 'verifying') goTo('stalled');
        }, STALL_MS);
        return () => window.clearTimeout(timer);
    }, [phase]);

    // Вернулись из звонилки — сразу экран ожидания и внеочередная проверка.
    useEffect(() => {
        const onVisible = () => {
            if (document.visibilityState !== 'visible' || !leftToCallRef.current) return;
            if (phaseRef.current === 'call' || phaseRef.current === 'stalled') startVerifying();
        };
        document.addEventListener('visibilitychange', onVisible);
        return () => document.removeEventListener('visibilitychange', onVisible);
    }, []);

    const showError = (cause: any) => {
        setError(
            cause?.message === 'expired'
                ? 'Время проверки истекло. Попробуйте снова.'
                : cause?.message === 'timeout'
                  ? 'Звонок не подтверждён. Попробуйте снова.'
                  : 'Ошибка авторизации. Попробуйте позже.',
        );
    };

    const finish = (token: string) => {
        clearPendingCall();
        goTo('success');
        try {
            navigator.vibrate?.(40);
        } catch {}
        window.setTimeout(() => onAuthenticated(token), SUCCESS_PAUSE_MS);
    };

    const awaitToken = async (checkId: string) => {
        checkIdRef.current = checkId;
        pollingRef.current = true;
        const controller = new AbortController();
        abortRef.current = controller;
        try {
            const token = await awaitCallToken(service, checkId, {
                signal: controller.signal,
                checkNow: () => {
                    if (!checkNowRef.current) return false;
                    checkNowRef.current = false;
                    return true;
                },
            });
            finish(token);
        } catch (cause: any) {
            if (cause?.message === 'aborted') return;
            showError(cause);
            if (cause?.message === 'expired' || cause?.message === 'timeout') {
                // Проверка больше не живёт — начинаем с номера заново.
                clearPendingCall();
                leftToCallRef.current = false;
                setCallPhonePretty(null);
                goTo('phone');
            } else {
                goTo('call');
            }
        } finally {
            // Флаг снимает только текущий цикл, а не прерванный предыдущий.
            if (abortRef.current === controller) pollingRef.current = false;
        }
    };

    // Страница перезапустилась (Custom Tab) с незавершённой проверкой: человек
    // почти наверняка уже позвонил — сразу показываем ожидание.
    useEffect(() => {
        const pending = getPendingCall(service);
        if (!pending) return;
        setPhone(pending.phone);
        setCallPhonePretty(pending.callPhonePretty);
        leftToCallRef.current = true;
        checkIdRef.current = pending.checkId;
        startVerifying();
        return () => {
            abortRef.current?.abort();
            pollingRef.current = false;
        };
    }, [service]);

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
        leftToCallRef.current = false;

        try {
            const { checkId, callPhonePretty: nextCallPhone, confirmed } = await initCall(service.apiUrl, phone);
            if (confirmed) {
                finish((await getToken(service.apiUrl, checkId)).token);
                return;
            }

            setCallPhonePretty(nextCallPhone);
            savePendingCall({
                serviceKey: service.key,
                phone,
                checkId,
                callPhonePretty: nextCallPhone,
                startedAt: Date.now(),
            });
            goTo('call');
            void awaitToken(checkId);
        } catch (cause) {
            showError(cause);
        } finally {
            setLoading(false);
        }
    };

    const copyNumber = async () => {
        if (!callPhonePretty) return;
        try {
            await navigator.clipboard.writeText(callPhonePretty);
        } catch {
            const input = document.createElement('textarea');
            input.value = callPhonePretty;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            input.remove();
        }
        leftToCallRef.current = true;
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
    };

    const markLeftToCall = () => {
        leftToCallRef.current = true;
    };

    const close = () => {
        clearPendingCall();
        abortRef.current?.abort();
        onClose();
    };

    // Во время ожидания и успеха случайный тап мимо окна не должен сбрасывать проверку.
    const busy = phase === 'verifying' || phase === 'success';

    return (
        <div className="auth-overlay" role="presentation" onClick={busy ? undefined : close}>
            <section
                className="auth-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="auth-title"
                aria-busy={busy}
                onClick={(event) => event.stopPropagation()}
            >
                {phase !== 'success' && (
                    <button type="button" className="auth-close" aria-label="Закрыть" onClick={close}>
                        <Icon name="close" size={18} />
                    </button>
                )}

                {phase === 'verifying' && (
                    <div className="auth-status" role="status" aria-live="polite">
                        <span className="auth-status-spinner" aria-hidden="true" />
                        <h2 id="auth-title" className="auth-title">Проверяем звонок…</h2>
                        <p className="auth-text">
                            Обычно это занимает до 10 секунд.
                            <br />
                            Не закрывайте страницу.
                        </p>
                    </div>
                )}

                {phase === 'success' && (
                    <div className="auth-status" role="status" aria-live="polite">
                        <span className="auth-status-check" aria-hidden="true">
                            <Icon name="check" size={32} />
                        </span>
                        <h2 id="auth-title" className="auth-title">Номер подтверждён</h2>
                        <p className="auth-text">Переходим к предложению…</p>
                    </div>
                )}

                {phase === 'stalled' && callPhonePretty && (
                    <div>
                        <h2 id="auth-title" className="auth-title">Звонок пока не дошёл</h2>
                        <p className="auth-text">
                            Иногда подтверждение приходит с задержкой. Проверьте ещё раз или позвоните снова на{' '}
                            <a href={`tel:${callPhonePretty}`} className="auth-inline-phone" onClick={markLeftToCall}>
                                {callPhonePretty}
                            </a>
                            .
                        </p>
                        {error && <p className="auth-error">{error}</p>}
                        <button type="button" className="button-primary button-block" onClick={startVerifying}>
                            Проверить ещё раз
                        </button>
                        <a
                            href={`tel:${callPhonePretty}`}
                            className="button-soft button-block auth-secondary"
                            onClick={markLeftToCall}
                        >
                            <Icon name="phone" size={16} />
                            Позвонить снова
                        </a>
                    </div>
                )}

                {(phase === 'phone' || phase === 'call') && (
                    <>
                        {appIcon && <img src={appIcon} alt="" width="64" height="64" className="auth-logo" />}
                        <h2 id="auth-title" className="auth-title">Вход по номеру телефона</h2>
                    </>
                )}

                {phase === 'phone' && (
                    <form onSubmit={startLogin}>
                        <p className="auth-text">Авторизация нужна только один раз. Для продолжения подтвердите номер звонком.</p>
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
                        <button type="submit" className="button-primary button-block" disabled={loading}>
                            {loading ? <span className="spinner" aria-label="Проверяем" /> : 'Продолжить'}
                        </button>
                        <p className="auth-note">
                            Нажимая «Продолжить», вы соглашаетесь на обработку номера телефона для входа.
                        </p>
                    </form>
                )}

                {phase === 'call' && callPhonePretty && (
                    <div>
                        <p className="auth-text">Позвоните на номер:</p>
                        <a href={`tel:${callPhonePretty}`} className="auth-phone" onClick={markLeftToCall}>
                            {callPhonePretty}
                        </a>
                        <div className="auth-actions">
                            <a href={`tel:${callPhonePretty}`} className="button-soft" onClick={markLeftToCall}>
                                <Icon name="phone" size={16} />
                                Позвонить
                            </a>
                            <button type="button" className="button-soft" onClick={copyNumber}>
                                <Icon name="copy" size={16} />
                                {copied ? 'Скопировано' : 'Копировать'}
                            </button>
                        </div>
                        <p className="auth-note auth-note-top">Мы определим ваш номер автоматически.</p>
                        {error && <p className="auth-error">{error}</p>}
                        <button type="button" className="button-primary button-block" onClick={startVerifying}>
                            Я позвонил
                        </button>
                    </div>
                )}
            </section>
        </div>
    );
}
