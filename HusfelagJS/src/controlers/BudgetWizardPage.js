import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Typography, CircularProgress, Button, Alert,
    IconButton, Tooltip, TextField, Select, MenuItem, FormControl, InputLabel,
} from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useHelp } from '../ui/HelpContext';
import { UserContext } from './UserContext';
import { apiFetch } from '../api';
import SideBar from './Sidebar';
import { fmtAmount } from '../format';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8010';

const TYPE_META = {
    SHARED: { label: 'Sameiginlegt', bg: '#e8f5e9', fg: '#2e7d32', dot: '#08C076', dist: 'eignahlut' },
    SHARE2: { label: 'Hiti',         bg: '#e0f2f1', fg: '#00838f', dot: '#26c6da', dist: 'hita-hlutfall' },
    SHARE3: { label: 'Lóð',          bg: '#fff3e0', fg: '#e65100', dot: '#f59e0b', dist: 'lóðar-hlutfall' },
    EQUAL:  { label: 'Jafnskipt',    bg: '#f3e5f5', fg: '#7b1fa2', dot: '#ab47bc', dist: 'jafnt' },
};
const TYPE_ORDER = ['SHARED', 'SHARE2', 'SHARE3', 'EQUAL'];
const MONO = '"JetBrains Mono", "Courier New", monospace';

function WizardStepper({ step, hasPrevious }) {
    const steps = [
        { n: 1, t: 'Upphafsstaða' },
        { n: 2, t: 'Upphæðir' },
        { n: 3, t: 'Staðfesting' },
    ];
    if (!hasPrevious) return null;
    return (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {steps.map((s, i) => {
                const active = s.n === step;
                const done = s.n < step;
                return (
                    <React.Fragment key={s.n}>
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{
                                width: 22, height: 22, borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: done ? '#08C076' : active ? '#1D366F' : '#fff',
                                border: active || done ? 'none' : '1.5px solid #e8e8e8',
                                color: done || active ? '#fff' : '#888',
                                fontSize: 11, fontWeight: 600, flexShrink: 0,
                            }}>
                                {done ? '✓' : s.n}
                            </Box>
                            <Typography sx={{
                                fontSize: 12.5,
                                color: active ? '#111' : done ? '#555' : '#888',
                                fontWeight: active ? 600 : 500,
                            }}>{s.t}</Typography>
                        </Box>
                        {i < steps.length - 1 && (
                            <Box sx={{ width: 28, height: 1, background: done ? '#08C076' : '#e8e8e8', mx: 1.5 }} />
                        )}
                    </React.Fragment>
                );
            })}
        </Box>
    );
}

function BudgetWizardPage() {
    const navigate = useNavigate();
    const { user, assocParam } = React.useContext(UserContext);
    const { openHelp } = useHelp();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [categories, setCategories] = useState([]);
    const [previousBudget, setPreviousBudget] = useState(null);
    const [hasPrevious, setHasPrevious] = useState(false);
    const [amounts, setAmounts] = useState({});
    const [choice, setChoice] = useState('copy');
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');

    const year = new Date().getFullYear();

    useEffect(() => {
        if (!user) { navigate('/login'); return; }
        Promise.all([
            apiFetch(`${API_URL}/Category/list`).then(r => r.ok ? r.json() : Promise.reject()),
            apiFetch(`${API_URL}/Budget/${user.id}${assocParam}`).then(r => r.ok ? r.json() : null).catch(() => null),
        ]).then(([cats, budget]) => {
            setCategories(cats);
            if (budget?.items?.length > 0) {
                setPreviousBudget(budget);
                setHasPrevious(true);
                setChoice('copy');
            } else {
                setChoice('fresh');
                setStep(2);
                const blank = {};
                cats.filter(c => c.is_default).forEach(c => { blank[c.id] = 0; });
                setAmounts(blank);
            }
            setLoading(false);
        }).catch(() => {
            setError('Villa við að sækja flokka. Reyndu aftur.');
            setLoading(false);
        });
    }, [user, assocParam, navigate]);

    const handleCopyPrevious = () => {
        const filled = {};
        if (previousBudget) {
            previousBudget.items.forEach(item => {
                filled[item.category_id] = Math.round(parseFloat(item.amount || 0));
            });
        }
        setAmounts(filled);
        setStep(2);
    };

    const handleStartFresh = () => {
        const blank = {};
        categories.filter(c => c.is_default).forEach(c => { blank[c.id] = 0; });
        setAmounts(blank);
        setStep(2);
    };

    const handleStep1Next = () => {
        if (choice === 'copy') handleCopyPrevious();
        else handleStartFresh();
    };

    const handleBack = () => {
        if (step === 2) {
            if (hasPrevious) setStep(1);
            else navigate('/aaetlun');
        } else if (step === 3) {
            setStep(2);
        } else {
            navigate('/aaetlun');
        }
    };

    const totals = useMemo(() => {
        const t = { SHARED: 0, SHARE2: 0, SHARE3: 0, EQUAL: 0 };
        categories.forEach(c => {
            if (amounts[c.id] !== undefined && t[c.type] !== undefined) {
                t[c.type] += (parseInt(amounts[c.id]) || 0);
            }
        });
        return t;
    }, [amounts, categories]);

    const grandTotal = useMemo(() => Object.values(totals).reduce((s, v) => s + v, 0), [totals]);

    const activeRows = useMemo(
        () => categories.filter(c => c.type !== 'INCOME' && amounts[c.id] !== undefined),
        [categories, amounts]
    );

    const handleConfirm = async () => {
        setSubmitError('');
        setSubmitting(true);
        const items = categories
            .map(c => ({ category_id: c.id, amount: parseInt(amounts[c.id]) || 0 }))
            .filter(i => i.amount > 0);
        try {
            const resp = await apiFetch(`${API_URL}/Budget/wizard${assocParam}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: user.id, items }),
            });
            if (resp.ok) navigate('/aaetlun');
            else {
                const data = await resp.json();
                setSubmitError(data.detail || 'Villa við að vista áætlun. Reyndu aftur.');
            }
        } catch { setSubmitError('Villa við að vista áætlun. Reyndu aftur.'); }
        finally { setSubmitting(false); }
    };

    if (loading) {
        return (
            <div className="dashboard">
                <SideBar />
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8, flex: 1 }}>
                    <CircularProgress color="secondary" />
                </Box>
            </div>
        );
    }

    return (
        <div className="dashboard">
            <SideBar />
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
                {/* Header */}
                <Box sx={{ px: 3, py: 2, background: '#fff', borderBottom: '1px solid #e8e8e8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                    <Box>
                        <Button
                            size="small" variant="text" color="inherit"
                            sx={{ color: '#555', textTransform: 'none', p: 0, minWidth: 0, mb: 0.5, fontSize: 12.5 }}
                            onClick={() => navigate('/aaetlun')}
                        >
                            ← Til baka í áætlun
                        </Button>
                        <Typography variant="h5">Ný áætlun {year}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <WizardStepper step={step} hasPrevious={hasPrevious} />
                        <Tooltip title="Hjálp">
                            <IconButton size="small" onClick={() => openHelp('aaetlun-wizard')}>
                                <HelpOutlineIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Box>

                {/* Scrollable content */}
                <Box sx={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
                    {error && <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>}
                    {step === 1 && (
                        <Step1
                            year={year}
                            hasPrevious={hasPrevious}
                            previousBudget={previousBudget}
                            choice={choice}
                            setChoice={setChoice}
                        />
                    )}
                    {step === 2 && (
                        <Step2
                            allCategories={categories}
                            amounts={amounts}
                            setAmounts={setAmounts}
                            totals={totals}
                            grandTotal={grandTotal}
                            activeRows={activeRows}
                        />
                    )}
                    {step === 3 && (
                        <Step3
                            year={year}
                            hasPrevious={hasPrevious}
                            totals={totals}
                            grandTotal={grandTotal}
                            activeRows={activeRows}
                            error={submitError}
                        />
                    )}
                </Box>

                {/* Sticky footer */}
                <Box sx={{ borderTop: '1px solid #e8e8e8', background: '#fff', flexShrink: 0 }}>
                    {/* Step 2: ambient totals strip */}
                    {step === 2 && (
                        <Box sx={{
                            px: 4, py: 1.25,
                            display: 'flex', alignItems: 'center', gap: 2.25,
                            borderBottom: '1px solid #f2f2f2',
                            fontSize: 12.5, color: '#555',
                            flexWrap: 'wrap',
                        }}>
                            <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: '#111', letterSpacing: '0.02em' }}>Samtals</Typography>
                            {TYPE_ORDER.filter(k => totals[k] > 0).map(k => (
                                <Box key={k} component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, fontSize: 12.5, color: '#555' }}>
                                    <Box component="span" sx={{ width: 7, height: 7, borderRadius: '2px', background: TYPE_META[k].dot, display: 'inline-block' }} />
                                    {TYPE_META[k].label}
                                    <Box component="span" sx={{ fontFamily: MONO, color: '#111', fontWeight: 500 }}>
                                        {fmtAmount(totals[k])}
                                    </Box>
                                </Box>
                            ))}
                            <Box sx={{ flex: 1 }} />
                            <Typography sx={{ fontSize: 13, color: '#555' }}>Heildartala</Typography>
                            <Typography sx={{ fontFamily: MONO, fontSize: 16, fontWeight: 600, color: '#111' }}>
                                {fmtAmount(grandTotal)}
                            </Typography>
                        </Box>
                    )}
                    {/* Nav buttons */}
                    <Box sx={{ px: 4, py: 1.75, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Button
                            variant="outlined"
                            onClick={handleBack}
                            sx={{ textTransform: 'none', borderColor: '#e8e8e8', color: '#555', '&:hover': { borderColor: '#bbb', background: 'rgba(0,0,0,0.02)' } }}
                        >
                            {step === 1 ? 'Hætta við' : '← Til baka'}
                        </Button>
                        {step < 3 ? (
                            <Button
                                variant="contained"
                                onClick={step === 1 ? handleStep1Next : () => setStep(3)}
                                disabled={step === 2 && activeRows.length === 0}
                                sx={{ textTransform: 'none', background: '#1D366F', color: '#fff', '&:hover': { background: '#162d5e' } }}
                            >
                                Áfram →
                            </Button>
                        ) : (
                            <Button
                                variant="contained"
                                disabled={submitting || grandTotal === 0}
                                onClick={handleConfirm}
                                sx={{ textTransform: 'none', background: '#08C076', color: '#fff', '&:hover': { background: '#06a866' } }}
                            >
                                {submitting
                                    ? <CircularProgress size={18} color="inherit" />
                                    : '✓ Staðfesta og virkja áætlun'}
                            </Button>
                        )}
                    </Box>
                </Box>
            </Box>
        </div>
    );
}

/* ============================================================ */
/*  Step 1 — Choose starting point                              */
/* ============================================================ */
function Step1({ year, hasPrevious, previousBudget, choice, setChoice }) {
    const prevTotal = previousBudget?.items?.reduce((s, i) => s + parseFloat(i.amount || 0), 0) || 0;
    const prevCount = previousBudget?.items?.length || 0;

    return (
        <Box sx={{ p: '24px 32px', maxWidth: 920 }}>
            <Box sx={{ mb: 3 }}>
                <Typography sx={{ fontSize: 22, fontWeight: 600, mb: 0.75 }}>Hvernig viltu byrja?</Typography>
                <Typography sx={{ fontSize: 14, color: '#555' }}>
                    Veldu hvort þú vilt afrita núverandi áætlun sem grunn eða byrja með auðu blaði.
                </Typography>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                {/* Copy card */}
                <Box
                    onClick={() => hasPrevious && setChoice('copy')}
                    sx={{
                        position: 'relative',
                        border: choice === 'copy' ? '2px solid #08C076' : '1px solid #e8e8e8',
                        borderRadius: '10px', p: '20px 22px', background: '#fff',
                        cursor: hasPrevious ? 'pointer' : 'default',
                        opacity: hasPrevious ? 1 : 0.5,
                        boxShadow: choice === 'copy' ? '0 0 0 4px #e8f5e9' : 'none',
                        transition: 'all 150ms',
                    }}
                >
                    {hasPrevious && choice === 'copy' && (
                        <Box sx={{
                            position: 'absolute', top: -11, left: 18,
                            background: '#08C076', color: '#fff',
                            fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em',
                            px: 1.25, py: '3px', borderRadius: '4px', textTransform: 'uppercase',
                        }}>Mælt með</Box>
                    )}
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                        <Box sx={{
                            width: 18, height: 18, borderRadius: '50%', flexShrink: 0, mt: '2px',
                            border: `2px solid ${choice === 'copy' ? '#08C076' : '#e8e8e8'}`,
                            background: choice === 'copy' ? '#08C076' : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            {choice === 'copy' && (
                                <Box sx={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />
                            )}
                        </Box>
                        <Box sx={{ flex: 1 }}>
                            <Typography sx={{ fontSize: 16, fontWeight: 600, mb: 0.5 }}>
                                {hasPrevious
                                    ? `Afrita Áætlun ${previousBudget?.year}${previousBudget?.version > 1 ? ` (v${previousBudget.version})` : ''}`
                                    : 'Afrita fyrri áætlun'}
                            </Typography>
                            <Typography sx={{ fontSize: 13, color: '#555', lineHeight: 1.5 }}>
                                {hasPrevious
                                    ? 'Byrjar með sömu flokka og upphæðir og núverandi virka áætlun. Þú breytir aðeins því sem þarf.'
                                    : 'Engin fyrri áætlun er til — þennan valmöguleika er ekki hægt að nota.'}
                            </Typography>
                            {hasPrevious && (
                                <Box sx={{ mt: 1.75, p: '10px 12px', border: '1px solid #e8e8e8', borderRadius: '6px', background: '#fafafa' }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, mb: 0.5 }}>
                                        <Typography component="span" sx={{ fontSize: 12, color: '#555' }}>Flokkar sem fluttir verða</Typography>
                                        <Typography component="span" sx={{ fontSize: 12, fontWeight: 600 }}>{prevCount}</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                        <Typography component="span" sx={{ fontSize: 12, color: '#555' }}>Heildartala</Typography>
                                        <Typography component="span" sx={{ fontSize: 12, fontWeight: 600, fontFamily: MONO }}>{fmtAmount(prevTotal)}</Typography>
                                    </Box>
                                </Box>
                            )}
                        </Box>
                    </Box>
                </Box>

                {/* Fresh card */}
                <Box
                    onClick={() => setChoice('fresh')}
                    sx={{
                        border: choice === 'fresh' ? '2px solid #1D366F' : '1px solid #e8e8e8',
                        borderRadius: '10px', p: '20px 22px', background: '#fff', cursor: 'pointer',
                        boxShadow: choice === 'fresh' ? '0 0 0 4px rgba(29,54,111,0.06)' : 'none',
                        transition: 'all 150ms',
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                        <Box sx={{
                            width: 18, height: 18, borderRadius: '50%', flexShrink: 0, mt: '2px',
                            border: `2px solid ${choice === 'fresh' ? '#1D366F' : '#e8e8e8'}`,
                            background: choice === 'fresh' ? '#1D366F' : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            {choice === 'fresh' && (
                                <Box sx={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />
                            )}
                        </Box>
                        <Box sx={{ flex: 1 }}>
                            <Typography sx={{ fontSize: 16, fontWeight: 600, mb: 0.5 }}>Byrja frá grunni</Typography>
                            <Typography sx={{ fontSize: 13, color: '#555', lineHeight: 1.5 }}>
                                Byrjar með sjálfgefna flokka en engar upphæðir. Gott ef forsendur hafa breyst mikið.
                            </Typography>
                            <Box sx={{ mt: 1.75, p: '10px 12px', border: '1px dashed #e8e8e8', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: 0.75, fontSize: 12, color: '#555' }}>
                                ✦ Sjálfgefnir flokkar — engar upphæðir
                            </Box>
                        </Box>
                    </Box>
                </Box>
            </Box>

            <Box sx={{ mt: 2.25, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Typography sx={{ fontSize: 12.5, color: '#555' }}>
                    ℹ Áætlunin er fyrst virkjuð þegar þú smellir á{' '}
                    <strong style={{ color: '#111' }}>Staðfesta og virkja</strong> í lokin.
                </Typography>
            </Box>
        </Box>
    );
}

/* ============================================================ */
/*  Step 2 — Amounts                                            */
/* ============================================================ */
function Step2({ allCategories, amounts, setAmounts, totals, grandTotal, activeRows }) {
    const groupedActive = useMemo(() => {
        const g = {};
        activeRows.forEach(c => {
            (g[c.type] = g[c.type] || []).push(c);
        });
        return g;
    }, [activeRows]);

    const activeGroups = TYPE_ORDER.filter(k => groupedActive[k]);
    const addableCategories = allCategories.filter(c => c.type !== 'INCOME' && amounts[c.id] === undefined);
    const quickPills = addableCategories.slice(0, 6);
    const extraCount = Math.max(0, addableCategories.length - 6);

    return (
        <Box sx={{ p: '20px 32px' }}>
            {/* Intro row */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2, gap: 3 }}>
                <Box sx={{ maxWidth: 560 }}>
                    <Typography sx={{ fontSize: 20, fontWeight: 600, mb: 0.5 }}>Upphæðir á ári</Typography>
                    <Typography sx={{ fontSize: 13.5, color: '#555', lineHeight: 1.5 }}>
                        Settu inn áætlað árleg kostnaður á hvern flokk.
                        Smelltu á <strong style={{ color: '#111' }}>+ Bæta við flokki</strong> til að bæta við.
                    </Typography>
                </Box>
            </Box>

            {/* No rows yet */}
            {activeRows.length === 0 && (
                <Box sx={{ py: 4, textAlign: 'center', color: '#888', fontSize: 14, border: '1px dashed #e8e8e8', borderRadius: '8px', mb: 2 }}>
                    Engir flokkar valdir. Bættu við flokk hér að neðan.
                </Box>
            )}

            {/* Grouped editable sections */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}>
                {activeGroups.map(k => {
                    const cfg = TYPE_META[k];
                    const groupTotal = groupedActive[k].reduce((s, c) => s + (parseInt(amounts[c.id]) || 0), 0);
                    return (
                        <Box key={k} sx={{ border: '1px solid #e8e8e8', borderRadius: '8px', overflow: 'hidden', background: '#fff' }}>
                            {/* Group header */}
                            <Box sx={{
                                display: 'flex', alignItems: 'center', gap: 1.25,
                                px: 2, py: 1.25,
                                background: '#fafafa', borderBottom: '1px solid #e8e8e8',
                            }}>
                                <Box sx={{ width: 8, height: 8, borderRadius: '2px', background: cfg.dot, flexShrink: 0 }} />
                                <Typography sx={{ fontSize: 13, fontWeight: 600, color: cfg.fg }}>{cfg.label}</Typography>
                                <Typography sx={{ fontSize: 11.5, color: '#555', flex: 1 }}>
                                    · skiptist eftir {cfg.dist}
                                </Typography>
                                <Typography sx={{ fontFamily: MONO, fontSize: 12.5, color: '#555' }}>
                                    {fmtAmount(groupTotal)}
                                </Typography>
                            </Box>

                            {/* Row items */}
                            {groupedActive[k].map((c, i) => (
                                <Box key={c.id} sx={{
                                    display: 'grid', gridTemplateColumns: '1fr 180px 100px 38px',
                                    px: 2, py: 1.25,
                                    borderBottom: i < groupedActive[k].length - 1 ? '1px solid #f2f2f2' : 'none',
                                    alignItems: 'center', fontSize: 13.5,
                                }}>
                                    <Box>{c.name}</Box>
                                    <Box sx={{ position: 'relative' }}>
                                        <TextField
                                            value={amounts[c.id] ? String(amounts[c.id]) : ''}
                                            onChange={e => {
                                                const v = parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0;
                                                setAmounts(prev => ({ ...prev, [c.id]: v }));
                                            }}
                                            placeholder="0"
                                            size="small"
                                            inputProps={{
                                                inputMode: 'numeric',
                                                style: { textAlign: 'right', fontFamily: MONO, fontWeight: 500, paddingRight: 32 },
                                            }}
                                            sx={{ width: '100%' }}
                                        />
                                        <Typography sx={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11.5, color: '#bbb', pointerEvents: 'none' }}>
                                            kr.
                                        </Typography>
                                    </Box>
                                    <Typography sx={{ textAlign: 'right', fontFamily: MONO, fontSize: 12, color: '#aaa', pr: 1 }}>
                                        {amounts[c.id] > 0 ? `${fmtAmount(Math.round(amounts[c.id] / 12))}/mán` : ''}
                                    </Typography>
                                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                        <Tooltip title="Fjarlægja flokk">
                                            <Box
                                                component="button"
                                                onClick={() => setAmounts(prev => {
                                                    const next = { ...prev };
                                                    delete next[c.id];
                                                    return next;
                                                })}
                                                sx={{
                                                    width: 28, height: 28, borderRadius: '50%',
                                                    border: 'none', background: 'transparent',
                                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    color: '#ccc', fontSize: 16,
                                                    '&:hover': { background: '#fff0f0', color: '#c62828' },
                                                    transition: '150ms',
                                                }}
                                            >×</Box>
                                        </Tooltip>
                                    </Box>
                                </Box>
                            ))}
                        </Box>
                    );
                })}
            </Box>

            {/* Add category area */}
            {addableCategories.length > 0 && (
                <Box sx={{
                    mt: 1.75, p: '14px 16px',
                    border: '1px dashed #e8e8e8', borderRadius: '8px',
                    background: '#fafafa',
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1.25 }}>
                        <Box sx={{ flex: 1 }}>
                            <Typography sx={{ fontSize: 13.5, fontWeight: 500, color: '#111' }}>Bæta við flokki</Typography>
                            <Typography sx={{ fontSize: 12, color: '#555', mt: 0.25 }}>
                                {addableCategories.length} {addableCategories.length === 1 ? 'flokkur' : 'flokkar'} í boði
                            </Typography>
                        </Box>
                        {addableCategories.length > 6 && (
                            <FormControl size="small" sx={{ minWidth: 200 }}>
                                <InputLabel>Velja flokk</InputLabel>
                                <Select
                                    value=""
                                    label="Velja flokk"
                                    onChange={e => {
                                        const id = e.target.value;
                                        if (id) setAmounts(prev => ({ ...prev, [id]: 0 }));
                                    }}
                                >
                                    {addableCategories.map(c => (
                                        <MenuItem key={c.id} value={c.id}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Box sx={{ width: 8, height: 8, borderRadius: '2px', background: TYPE_META[c.type]?.dot || '#ccc', flexShrink: 0 }} />
                                                {c.name}
                                            </Box>
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        )}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', alignItems: 'center' }}>
                        {quickPills.map(c => (
                            <Box
                                key={c.id}
                                component="button"
                                onClick={() => setAmounts(prev => ({ ...prev, [c.id]: 0 }))}
                                sx={{
                                    display: 'inline-flex', alignItems: 'center', gap: 0.75,
                                    px: 1.5, py: '5px',
                                    border: '1px solid #e8e8e8', background: '#fff',
                                    borderRadius: 999, fontSize: 12, cursor: 'pointer',
                                    fontFamily: 'inherit', color: '#333',
                                    '&:hover': { borderColor: '#1D366F', color: '#1D366F', background: 'rgba(29,54,111,0.04)' },
                                    transition: '150ms',
                                }}
                            >
                                <Box component="span" sx={{ fontSize: 13, color: '#aaa', lineHeight: 1 }}>+</Box>
                                {c.name}
                                <Box component="span" sx={{ width: 6, height: 6, borderRadius: '2px', background: TYPE_META[c.type]?.dot || '#ccc', display: 'inline-block', ml: 0.25 }} />
                            </Box>
                        ))}
                        {extraCount > 0 && (
                            <Typography sx={{ fontSize: 12, color: '#aaa', px: 0.5 }}>
                                + {extraCount} fleiri
                            </Typography>
                        )}
                    </Box>
                </Box>
            )}
        </Box>
    );
}

/* ============================================================ */
/*  Step 3 — Confirmation                                       */
/* ============================================================ */
function Step3({ year, hasPrevious, totals, grandTotal, activeRows, error }) {
    const activeGroups = TYPE_ORDER.filter(k => totals[k] > 0);

    return (
        <Box sx={{ p: '24px 32px', maxWidth: 880, width: '100%' }}>
            <Box sx={{ mb: 2.25 }}>
                <Typography sx={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: '#888', mb: 0.5 }}>
                    Yfirlit og staðfesting
                </Typography>
                <Typography sx={{ fontSize: 24, fontWeight: 600, mb: 0.75 }}>Áætlun {year}</Typography>
                <Typography sx={{ fontSize: 14, color: '#555' }}>
                    Þegar þú staðfestir verður þessi áætlun virk og notuð við næstu innheimtu húsgjalda.
                </Typography>
            </Box>

            {/* Headline total card */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 1.75, mb: 2.25 }}>
                <Box sx={{
                    p: '20px 22px',
                    border: '1px solid #1D366F',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #1D366F 0%, #0d2154 100%)',
                    color: '#fff',
                }}>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', mb: 0.5 }}>
                        Heildartala
                    </Typography>
                    <Typography sx={{ fontFamily: MONO, fontSize: 36, fontWeight: 300, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                        {fmtAmount(grandTotal)}
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', mt: 0.75 }}>
                        {fmtAmount(Math.round(grandTotal / 12))}/mán · 12 mánuðir
                    </Typography>
                </Box>
                <Box sx={{ p: '20px 22px', border: '1px solid #e8e8e8', borderRadius: '10px', background: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <Typography sx={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: '#888', mb: 0.5 }}>
                        Flokkar í áætlun
                    </Typography>
                    <Typography sx={{ fontFamily: MONO, fontSize: 26, fontWeight: 400, color: '#111' }}>
                        {activeRows.length}
                    </Typography>
                    <Typography sx={{ fontSize: 12.5, color: '#555', mt: 0.5 }}>
                        í {activeGroups.length} tegundum
                    </Typography>
                </Box>
            </Box>

            {/* Per-type breakdown */}
            <Typography sx={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: '#888', mb: 1.25 }}>
                Skipting eftir tegund
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                {activeGroups.map(k => {
                    const cfg = TYPE_META[k];
                    const pct = grandTotal > 0 ? (totals[k] / grandTotal) * 100 : 0;
                    const count = activeRows.filter(c => c.type === k).length;
                    return (
                        <Box key={k} sx={{
                            display: 'grid', gridTemplateColumns: '200px 1fr 140px',
                            alignItems: 'center', gap: 1.75,
                            p: '10px 14px', border: '1px solid #e8e8e8',
                            borderRadius: '8px', background: '#fff',
                        }}>
                            <Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontSize: 13, fontWeight: 600, color: cfg.fg }}>
                                    <Box sx={{ width: 8, height: 8, borderRadius: '2px', background: cfg.dot }} />
                                    {cfg.label}
                                </Box>
                                <Typography sx={{ fontSize: 11.5, color: '#555', mt: 0.25 }}>
                                    {count} {count === 1 ? 'flokkur' : 'flokkar'}
                                </Typography>
                            </Box>
                            <Box>
                                <Box sx={{ height: 8, borderRadius: 999, background: '#f3f4f6', overflow: 'hidden' }}>
                                    <Box sx={{ width: `${pct}%`, height: '100%', background: cfg.dot }} />
                                </Box>
                                <Typography sx={{ fontSize: 11.5, color: '#555', mt: 0.5 }}>
                                    {pct.toFixed(1)}% af heildaráætlun
                                </Typography>
                            </Box>
                            <Typography sx={{ textAlign: 'right', fontFamily: MONO, fontSize: 15, fontWeight: 600 }}>
                                {fmtAmount(totals[k])}
                            </Typography>
                        </Box>
                    );
                })}
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {/* Reassurance */}
            <Box sx={{
                p: '12px 14px', borderRadius: '8px',
                background: '#e8f5e9',
                display: 'flex', alignItems: 'flex-start', gap: 1.25,
                fontSize: 12.5, color: '#333',
            }}>
                <Typography component="span" sx={{ fontSize: 18, color: '#2e7d32', flexShrink: 0, lineHeight: 1.3 }}>ℹ</Typography>
                <Typography sx={{ fontSize: 12.5, lineHeight: 1.5 }}>
                    <strong style={{ color: '#111' }}>Hvað gerist næst:</strong>{' '}
                    Þegar áætlunin er virkjuð verður hún notuð við útgáfu næstu húsgjaldareikninga.
                    Fyrri útgáfa verður geymd og þú getur alltaf séð hana í sögunni.
                </Typography>
            </Box>
        </Box>
    );
}

export default BudgetWizardPage;
