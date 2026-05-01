import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Typography, CircularProgress, Paper,
    Button, TextField, Collapse, IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions,
    Alert, Divider, Tooltip, DialogContentText,
    FormControlLabel, Checkbox,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import AddIcon from '@mui/icons-material/Add';
import { useHelp } from '../ui/HelpContext';
import { UserContext } from './UserContext';
import { apiFetch } from '../api';
import SideBar from './Sidebar';
import { fmtPct, fmtKennitala } from '../format';
import { primaryButtonSx, secondaryButtonSx, ghostButtonSx, destructiveButtonSx } from '../ui/buttons';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8010';
const NAVY = '#1D366F';
const GREEN = '#08C076';
const BORDER = '#e8e8e8';
const BORDER_ROW = '#f2f2f2';
const COLS = '110px 140px 90px 80px 80px 80px minmax(200px, 1fr) 44px';

function getInitials(name) {
    const words = (name || '').trim().split(/\s+/);
    return words.slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('');
}

function OwnerPill({ o }) {
    const isGreen = o.is_payer;
    const bg = isGreen ? 'rgba(8,192,118,0.12)' : 'rgba(29,54,111,0.10)';
    const fg = isGreen ? GREEN : NAVY;
    return (
        <Box sx={{
            display: 'inline-flex', alignItems: 'center', gap: '7px',
            background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 999,
            py: '2px', pl: '2px', pr: '10px', fontSize: 12.5, whiteSpace: 'nowrap',
        }}>
            <Box sx={{
                width: 22, height: 22, borderRadius: '50%',
                background: bg, color: fg, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 600, fontSize: 10.5,
            }}>
                {getInitials(o.name)}
            </Box>
            <span>{o.name}</span>
            {o.is_payer && (
                <Box sx={{
                    width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
                    background: GREEN, color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, fontWeight: 700, ml: '-4px',
                }}>
                    kr
                </Box>
            )}
        </Box>
    );
}

function TableHeader({ cols, showOwners = true }) {
    return (
        <Box sx={{
            display: 'grid', gridTemplateColumns: cols,
            px: 2.25, py: 1.25,
            background: '#f5f5f5', borderBottom: `1px solid ${BORDER}`,
            fontSize: '0.7rem', fontWeight: 600, color: '#888',
            letterSpacing: '0.06em', textTransform: 'uppercase', alignItems: 'center',
        }}>
            <Box>Merking</Box>
            <Box>Fastanúmer</Box>
            <Box sx={{ textAlign: 'right' }}>Stærð</Box>
            <Box sx={{ textAlign: 'right', color: NAVY }}>Hlutfall</Box>
            <Box sx={{ textAlign: 'right', color: NAVY }}>Hiti</Box>
            <Box sx={{ textAlign: 'right', color: NAVY }}>Lóð</Box>
            <Box sx={{ pl: '18px', borderLeft: `1px dashed ${BORDER}` }}>
                {showOwners ? 'Eigendur' : ''}
            </Box>
            <Box />
        </Box>
    );
}

function ApartmentsPage() {
    const navigate = useNavigate();
    const { user, assocParam } = React.useContext(UserContext);
    const { openHelp } = useHelp();
    const [apartments, setApartments] = useState(undefined);
    const [error, setError] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [showDisabled, setShowDisabled] = useState(false);

    useEffect(() => {
        if (!user) { navigate('/login'); return; }
        loadApartments();
    }, [user, assocParam]); // eslint-disable-line react-hooks/exhaustive-deps

    const loadApartments = async () => {
        try {
            const resp = await apiFetch(`${API_URL}/Apartment/${user.id}${assocParam}`);
            if (resp.ok) setApartments(await resp.json());
            else { setError('Villa við að sækja íbúðir.'); setApartments([]); }
        } catch {
            setError('Tenging við þjón mistókst.'); setApartments([]);
        }
    };

    if (apartments === undefined) {
        return (
            <div className="dashboard">
                <SideBar />
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8, flex: 1 }}>
                    <CircularProgress color="secondary" />
                </Box>
            </div>
        );
    }

    const active = [...apartments.filter(a => !a.deleted)]
        .sort((a, b) => a.anr.localeCompare(b.anr, 'is'));
    const disabled = [...apartments.filter(a => a.deleted)]
        .sort((a, b) => a.anr.localeCompare(b.anr, 'is'));

    const totalSize   = active.reduce((s, a) => s + parseFloat(a.size   || 0), 0);
    const totalShare  = active.reduce((s, a) => s + parseFloat(a.share  || 0), 0);
    const totalShare2 = active.reduce((s, a) => s + parseFloat(a.share_2 || 0), 0);
    const totalShare3 = active.reduce((s, a) => s + parseFloat(a.share_3 || 0), 0);
    const totalOwners = active.reduce((s, a) => s + (a.owners?.length || 0), 0);
    const ratiosOk = active.length > 0 &&
        [totalShare, totalShare2, totalShare3].every(v => Math.abs(v - 100) < 0.01);

    const KPIS = [
        { label: 'HLUTFALL', val: totalShare,  hint: 'Almennur rekstur', desc: 'Skipt eftir eignarhluta í þinglýstu skjali.' },
        { label: 'HITI',     val: totalShare2, hint: 'Hitakostnaður',    desc: 'Eftir m² eða mæli — fer eftir samningi.' },
        { label: 'LÓÐ',      val: totalShare3, hint: 'Lóðarframlag',     desc: 'Skipt eftir lóðarmældum hluta.' },
    ];

    return (
        <div className="dashboard">
            <SideBar />
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

                {/* Zone ①: Header */}
                <Box sx={{ px: 3, py: 2, background: '#fff', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                    <Box>
                        <Typography variant="h5">
                            Íbúðir
                            {active.length > 0 && (
                                <Box component="span" sx={{ fontWeight: 300, color: 'text.disabled', ml: 1 }}>
                                    {active.length}
                                </Box>
                            )}
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Button variant="outlined" sx={secondaryButtonSx} onClick={() => navigate('/ibudir/innflutningur')}>
                            ⬇ Innflutningur
                        </Button>
                        <Button variant="contained" sx={primaryButtonSx} onClick={() => setShowForm(true)}>
                            + Bæta við íbúð
                        </Button>
                        <Tooltip title="Hjálp">
                            <IconButton size="small" onClick={() => openHelp('ibudir')}>
                                <HelpOutlineIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Box>

                {/* Zone ③: Content */}
                <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
                    <AddApartmentDialog
                        open={showForm}
                        onClose={() => setShowForm(false)}
                        userId={user.id}
                        assocParam={assocParam}
                        apartments={active}
                        onCreated={(updated) => { setShowForm(false); setApartments(updated); }}
                    />

                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                    {active.length === 0 ? (
                        <Paper variant="outlined" sx={{ p: 3, borderColor: 'secondary.main', bgcolor: 'rgba(8,192,118,0.05)' }}>
                            <Typography variant="subtitle1" color="secondary" sx={{ mb: 0.5 }}>
                                Setja upp íbúðir sjálfkrafa
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Enginn búinn að skrá íbúðir. Notaðu HMS fasteignaskrána til að flytja inn lista yfir íbúðir sjálfkrafa.
                            </Typography>
                            <Button variant="contained" sx={primaryButtonSx} onClick={() => navigate('/ibudir/innflutningur')}>
                                Flytja inn frá HMS →
                            </Button>
                        </Paper>
                    ) : (
                        <>
                            {/* KPI strip */}
                            <Box sx={{
                                display: 'grid',
                                gridTemplateColumns: '0.95fr 1fr 1fr 1fr',
                                border: `1px solid ${BORDER}`,
                                borderRadius: 2,
                                overflow: 'hidden',
                                mb: 2,
                            }}>
                                <Box sx={{
                                    px: 2.25, py: 1.75,
                                    background: '#fafafa',
                                    borderRight: `1px solid ${BORDER}`,
                                    display: 'flex', flexDirection: 'column',
                                }}>
                                    <Typography sx={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', color: NAVY, textTransform: 'uppercase', mb: 0.75 }}>
                                        EIGNARHLUTFÖLL
                                    </Typography>
                                    <Typography sx={{ fontSize: 12.5, color: 'text.secondary', lineHeight: 1.45, flex: 1 }}>
                                        Þrír kostnaðarlyklar skipta sameiginlegum kostnaði. Skráðir við stofnun · breytast sjaldan.
                                    </Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 1.25 }}>
                                        {ratiosOk
                                            ? <CheckCircleOutlineIcon sx={{ fontSize: 15, color: '#2e7d32' }} />
                                            : <ErrorOutlineIcon sx={{ fontSize: 15, color: '#c62828' }} />
                                        }
                                        <Typography sx={{ fontSize: 12, color: ratiosOk ? '#2e7d32' : '#c62828' }}>
                                            {ratiosOk ? 'Allir lyklar = 100,00%' : 'Súlur stemma ekki'}
                                        </Typography>
                                    </Box>
                                </Box>

                                {KPIS.map((c, i) => (
                                    <Box key={i} sx={{
                                        px: 2.25, py: 1.75,
                                        borderRight: i < 2 ? `1px solid ${BORDER}` : 'none',
                                        display: 'flex', flexDirection: 'column',
                                    }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.25 }}>
                                            <Typography sx={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', color: '#888', textTransform: 'uppercase' }}>
                                                {c.label}
                                            </Typography>
                                            <Typography sx={{ fontSize: 10.5, color: 'text.disabled' }}>{c.hint}</Typography>
                                        </Box>
                                        <Typography sx={{ fontSize: 22, fontWeight: 300, mt: 0.25, letterSpacing: '-0.01em', color: NAVY }}>
                                            {fmtPct(c.val)}
                                        </Typography>
                                        <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mt: 0.75, lineHeight: 1.4 }}>
                                            {c.desc}
                                        </Typography>
                                    </Box>
                                ))}
                            </Box>

                            {/* Main table */}
                            <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
                                <TableHeader cols={COLS} />
                                {active.map((apt, i) => (
                                    <ApartmentRowV1
                                        key={apt.id}
                                        apt={apt}
                                        apartments={active}
                                        isLast={i === active.length - 1}
                                        onOwnersChanged={loadApartments}
                                        onSaved={loadApartments}
                                    />
                                ))}
                                {/* Totals footer */}
                                <Box sx={{
                                    display: 'grid', gridTemplateColumns: COLS,
                                    px: 2.25, py: 1.5,
                                    borderTop: '2px solid rgba(0,0,0,0.12)',
                                    background: '#fafafa',
                                    fontWeight: 600, fontSize: 13, alignItems: 'center',
                                }}>
                                    <Box>Samtals</Box>
                                    <Box />
                                    <Box sx={{ textAlign: 'right', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                                        {totalSize.toFixed(2)} m²
                                    </Box>
                                    <Box sx={{ textAlign: 'right', fontFamily: 'monospace', color: ratiosOk ? '#2e7d32' : '#c62828' }}>
                                        {fmtPct(totalShare)}
                                    </Box>
                                    <Box sx={{ textAlign: 'right', fontFamily: 'monospace', color: ratiosOk ? '#2e7d32' : '#c62828' }}>
                                        {fmtPct(totalShare2)}
                                    </Box>
                                    <Box sx={{ textAlign: 'right', fontFamily: 'monospace', color: ratiosOk ? '#2e7d32' : '#c62828' }}>
                                        {fmtPct(totalShare3)}
                                    </Box>
                                    <Box sx={{ pl: '18px', borderLeft: `1px dashed ${BORDER}`, fontWeight: 400, fontSize: 12.5, color: 'text.secondary' }}>
                                        {totalOwners} eigendur
                                    </Box>
                                    <Box />
                                </Box>
                            </Paper>

                            {/* Legend + inactive toggle */}
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                    <Box sx={{
                                        width: 14, height: 14, borderRadius: '50%',
                                        background: GREEN, color: '#fff',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 9, fontWeight: 700,
                                    }}>kr</Box>
                                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Greiðandi reiknings</Typography>
                                </Box>
                                {disabled.length > 0 && (
                                    <Button size="small" sx={{ ...ghostButtonSx, p: 0, minWidth: 0 }} onClick={() => setShowDisabled(v => !v)}>
                                        {showDisabled ? '▲' : '▼'} Óvirkar íbúðir ({disabled.length})
                                    </Button>
                                )}
                            </Box>

                            {/* Inactive apartments */}
                            {disabled.length > 0 && (
                                <Collapse in={showDisabled}>
                                    <Paper variant="outlined" sx={{ mt: 1, overflow: 'hidden' }}>
                                        <TableHeader cols={COLS} showOwners={false} />
                                        {disabled.map((apt, i) => (
                                            <ApartmentRowV1
                                                key={apt.id}
                                                apt={apt}
                                                apartments={active}
                                                isLast={i === disabled.length - 1}
                                                onOwnersChanged={loadApartments}
                                                onSaved={loadApartments}
                                                isDisabled
                                            />
                                        ))}
                                    </Paper>
                                </Collapse>
                            )}
                        </>
                    )}
                </Box>
            </Box>
        </div>
    );
}

function ApartmentRowV1({ apt, apartments, isLast, onOwnersChanged, onSaved, isDisabled }) {
    const [ownerDialogOpen, setOwnerDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const { user } = React.useContext(UserContext);

    return (
        <>
            <Box sx={{
                display: 'grid', gridTemplateColumns: COLS,
                px: 2.25, py: 1.75,
                borderBottom: isLast ? 'none' : `1px solid ${BORDER_ROW}`,
                alignItems: 'center', fontSize: 13.5,
                opacity: isDisabled ? 0.55 : 1,
                transition: 'background 0.1s',
                '&:hover': { background: '#fafafa' },
            }}>
                <Box sx={{ fontWeight: 500 }}>{apt.anr}</Box>
                <Box sx={{ fontFamily: 'monospace', fontSize: 12, color: 'text.secondary' }}>{apt.fnr}</Box>
                <Box sx={{ textAlign: 'right', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                    {parseFloat(apt.size || 0).toFixed(2)}
                    <Box component="span" sx={{ fontSize: 11, color: 'text.disabled', ml: '3px' }}>m²</Box>
                </Box>
                <Box sx={{ textAlign: 'right', fontFamily: 'monospace', color: NAVY, fontWeight: 500 }}>
                    {fmtPct(apt.share)}
                </Box>
                <Box sx={{ textAlign: 'right', fontFamily: 'monospace', color: NAVY, fontWeight: 500 }}>
                    {fmtPct(apt.share_2)}
                </Box>
                <Box sx={{ textAlign: 'right', fontFamily: 'monospace', color: NAVY, fontWeight: 500 }}>
                    {fmtPct(apt.share_3)}
                </Box>
                <Box sx={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', pl: '18px', borderLeft: `1px dashed ${BORDER}` }}>
                    {!isDisabled && apt.owners?.map(o => <OwnerPill key={o.id} o={o} />)}
                    {!isDisabled && (
                        <Box
                            component="button"
                            onClick={() => setOwnerDialogOpen(true)}
                            sx={{
                                display: 'inline-flex', alignItems: 'center', gap: '4px',
                                background: 'transparent', border: `1px dashed ${BORDER}`,
                                borderRadius: 999, px: 1.25, py: '3px',
                                fontSize: 12, color: 'text.secondary', cursor: 'pointer',
                                '&:hover': { borderColor: NAVY, color: NAVY },
                            }}
                        >
                            <AddIcon sx={{ fontSize: 13 }} />Eigandi
                        </Box>
                    )}
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Tooltip title={isDisabled ? 'Virkja / breyta' : 'Breyta'}>
                        <IconButton size="small" onClick={() => setEditDialogOpen(true)}>
                            <EditIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            {!isDisabled && (
                <OwnerDialog
                    open={ownerDialogOpen}
                    onClose={() => setOwnerDialogOpen(false)}
                    apt={apt}
                    userId={user?.id}
                    onChanged={() => { setOwnerDialogOpen(false); onOwnersChanged(); }}
                />
            )}
            <EditApartmentDialog
                open={editDialogOpen}
                onClose={() => setEditDialogOpen(false)}
                apt={apt}
                apartments={apartments}
                isDisabled={isDisabled}
                onSaved={() => { setEditDialogOpen(false); onSaved(); }}
                onDeleted={() => { setEditDialogOpen(false); onSaved(); }}
            />
        </>
    );
}

// ─── Dialogs (unchanged) ─────────────────────────────────────────────────────

function ShareField({ label, value, onChange, helperText, error, disabled }) {
    return (
        <TextField
            label={label}
            value={value}
            onChange={e => onChange(e.target.value.replace(/[^0-9.]/g, ''))}
            size="small"
            type="number"
            inputProps={{ min: 0, max: 100, step: 0.01 }}
            helperText={helperText}
            error={!!error}
            disabled={disabled}
            FormHelperTextProps={{ sx: { whiteSpace: 'normal' } }}
            fullWidth
        />
    );
}

function SameShareCheckbox({ checked, onChange }) {
    return (
        <FormControlLabel
            control={<Checkbox checked={checked} onChange={e => onChange(e.target.checked)} size="small" color="secondary" sx={{ py: 0 }} />}
            label={<Typography variant="caption" color="text.secondary">Nota matshlutfall</Typography>}
            sx={{ mt: -0.5, ml: 0.5 }}
        />
    );
}

function AddApartmentDialog({ open, onClose, userId, assocParam, apartments, onCreated }) {
    const [anr, setAnr] = useState('');
    const [fnr, setFnr] = useState('');
    const [size, setSize] = useState('');
    const [share, setShare] = useState('');
    const [share2, setShare2] = useState('');
    const [share2Same, setShare2Same] = useState(false);
    const [share3, setShare3] = useState('');
    const [share3Same, setShare3Same] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    React.useEffect(() => {
        if (!open) {
            setAnr(''); setFnr(''); setSize(''); setShare('');
            setShare2(''); setShare2Same(false);
            setShare3(''); setShare3Same(false);
            setSaving(false); setError('');
        }
    }, [open]);

    const eff2 = share2Same ? share : share2;
    const eff3 = share3Same ? share : share3;

    const existingShare  = apartments.reduce((s, a) => s + parseFloat(a.share  || 0), 0);
    const existingShare2 = apartments.reduce((s, a) => s + parseFloat(a.share_2 || 0), 0);
    const existingShare3 = apartments.reduce((s, a) => s + parseFloat(a.share_3 || 0), 0);
    const round2 = n => Math.round(n * 100) / 100;
    const shareOver  = parseFloat(share)  > 0 && round2(existingShare  + parseFloat(share))  > 100;
    const share2Over = parseFloat(eff2)   > 0 && round2(existingShare2 + parseFloat(eff2))   > 100;
    const share3Over = parseFloat(eff3)   > 0 && round2(existingShare3 + parseFloat(eff3))   > 100;

    const isValid = anr.trim() && fnr.trim()
        && parseFloat(share) >= 0 && parseFloat(eff2) >= 0 && parseFloat(eff3) >= 0
        && !shareOver && !share2Over && !share3Over;

    const handleSubmit = async () => {
        setError(''); setSaving(true);
        try {
            const resp = await apiFetch(`${API_URL}/Apartment${assocParam}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId, anr, fnr, size: parseFloat(size) || 0, share: parseFloat(share) || 0, share_2: parseFloat(eff2) || 0, share_3: parseFloat(eff3) || 0 }),
            });
            if (resp.ok) { onCreated(await resp.json()); }
            else { const d = await resp.json(); setError(d.detail || 'Villa við skráningu.'); }
        } catch { setError('Tenging við þjón mistókst.'); }
        finally { setSaving(false); }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ pb: 0.5 }}>
                Skrá nýja íbúð
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 400, mt: 0.5 }}>
                    Íbúðin verður bætt við húsfélagið
                </Typography>
            </DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField label="Merking" value={anr} onChange={e => setAnr(e.target.value)} size="small" fullWidth />
                    <TextField label="Fastanúmer" value={fnr} onChange={e => setFnr(e.target.value)} size="small" fullWidth />
                </Box>
                <TextField label="Stærð (m²)" value={size} onChange={e => setSize(e.target.value.replace(/[^0-9.]/g, ''))} size="small" type="number" inputProps={{ min: 0, step: 0.01 }} helperText="Flatarmál íbúðar í fermetrum" fullWidth />
                <ShareField label="Matshlutfall (%)" value={share} onChange={setShare} helperText="Matshluti hverrar íbúðar skv. eignaskiptasamningi" error={shareOver ? 'Heildarhlutfall fer yfir 100%' : ''} />
                {shareOver && <Alert severity="error" sx={{ mt: -1 }}>Heildarhlutfall (share) myndi fara yfir 100%</Alert>}
                <Box>
                    <ShareField label="Matshlutfall hita (%)" value={eff2} onChange={setShare2} helperText="Matshluti hita skv. eignaskiptasamningi" error={share2Over ? 'Heildarhlutfall fer yfir 100%' : ''} disabled={share2Same} />
                    <SameShareCheckbox checked={share2Same} onChange={setShare2Same} />
                </Box>
                {share2Over && <Alert severity="error" sx={{ mt: -1 }}>Heildarhlutfall (share 2) myndi fara yfir 100%</Alert>}
                <Box>
                    <ShareField label="Matshlutfall lóðar (%)" value={eff3} onChange={setShare3} helperText="Matshluti lóðar skv. eignaskiptasamningi" error={share3Over ? 'Heildarhlutfall fer yfir 100%' : ''} disabled={share3Same} />
                    <SameShareCheckbox checked={share3Same} onChange={setShare3Same} />
                </Box>
                {share3Over && <Alert severity="error" sx={{ mt: -1 }}>Heildarhlutfall (share 3) myndi fara yfir 100%</Alert>}
                {error && <Alert severity="error">{error}</Alert>}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5, justifyContent: 'flex-end' }}>
                <Button sx={ghostButtonSx} onClick={onClose}>Hætta við</Button>
                <Button variant="contained" sx={primaryButtonSx} disabled={!isValid || saving} onClick={handleSubmit}>
                    {saving ? <CircularProgress size={18} color="inherit" /> : 'Skrá íbúð'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

function EditApartmentDialog({ open, onClose, apt, apartments, isDisabled, onSaved, onDeleted }) {
    const [anr, setAnr] = useState(apt.anr);
    const [fnr, setFnr] = useState(apt.fnr);
    const [size, setSize] = useState(String(apt.size || ''));
    const [share, setShare] = useState(String(apt.share));
    const [share2, setShare2] = useState(String(apt.share_2));
    const [share2Same, setShare2Same] = useState(false);
    const [share3, setShare3] = useState(String(apt.share_3));
    const [share3Same, setShare3Same] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [error, setError] = useState('');

    React.useEffect(() => {
        if (open) {
            setAnr(apt.anr); setFnr(apt.fnr); setSize(String(apt.size || ''));
            setShare(String(apt.share)); setShare2(String(apt.share_2)); setShare3(String(apt.share_3));
            setShare2Same(false); setShare3Same(false); setError('');
        }
    }, [open, apt]);

    const eff2 = share2Same ? share : share2;
    const eff3 = share3Same ? share : share3;

    const others = apartments.filter(a => a.id !== apt.id);
    const otherShare  = others.reduce((s, a) => s + parseFloat(a.share  || 0), 0);
    const otherShare2 = others.reduce((s, a) => s + parseFloat(a.share_2 || 0), 0);
    const otherShare3 = others.reduce((s, a) => s + parseFloat(a.share_3 || 0), 0);
    const round2 = n => Math.round(n * 100) / 100;
    const shareOver  = parseFloat(share)  >= 0 && round2(otherShare  + parseFloat(share))  > 100;
    const share2Over = parseFloat(eff2)   >= 0 && round2(otherShare2 + parseFloat(eff2))   > 100;
    const share3Over = parseFloat(eff3)   >= 0 && round2(otherShare3 + parseFloat(eff3))   > 100;

    const isValid = anr.trim() && fnr.trim()
        && parseFloat(share) >= 0 && parseFloat(eff2) >= 0 && parseFloat(eff3) >= 0
        && !shareOver && !share2Over && !share3Over;

    const payload = { anr, fnr, size: parseFloat(size) || 0, share: parseFloat(share) || 0, share_2: parseFloat(eff2) || 0, share_3: parseFloat(eff3) || 0 };

    const handleSave = async () => {
        setError(''); setSaving(true);
        try {
            const resp = await apiFetch(`${API_URL}/Apartment/update/${apt.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (resp.ok) { onSaved(); }
            else { const d = await resp.json(); setError(d.detail || 'Villa við uppfærslu.'); }
        } catch { setError('Tenging við þjón mistókst.'); }
        finally { setSaving(false); }
    };

    const handleDisable = async () => {
        setDeleting(true);
        try {
            const resp = await apiFetch(`${API_URL}/Apartment/delete/${apt.id}`, { method: 'DELETE' });
            if (resp.ok) { setConfirmDelete(false); onDeleted(); }
            else { const d = await resp.json(); setError(d.detail || 'Villa við óvirkjun.'); setConfirmDelete(false); }
        } catch { setError('Tenging við þjón mistókst.'); setConfirmDelete(false); }
        finally { setDeleting(false); }
    };

    const handleEnable = async () => {
        setError(''); setSaving(true);
        try {
            const resp = await apiFetch(`${API_URL}/Apartment/enable/${apt.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (resp.ok) { onSaved(); }
            else { const d = await resp.json(); setError(d.detail || 'Villa við virkjun.'); }
        } catch { setError('Tenging við þjón mistókst.'); }
        finally { setSaving(false); }
    };

    return (
        <>
            <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
                <DialogTitle>{isDisabled ? `Óvirk íbúð — ${apt.anr}` : `Breyta íbúð — ${apt.anr}`}</DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
                    <Box>
                        <Typography variant="body1" fontWeight={500}>{apt.anr}</Typography>
                        <Typography variant="body2" color="text.secondary">Fastanúmer: {apt.fnr}</Typography>
                    </Box>
                    <TextField label="Merking" value={anr} onChange={e => setAnr(e.target.value)} size="small" fullWidth />
                    <TextField label="Fastanúmer" value={fnr} onChange={e => setFnr(e.target.value)} size="small" fullWidth />
                    <TextField label="Stærð (m²)" value={size} onChange={e => setSize(e.target.value.replace(/[^0-9.]/g, ''))} size="small" type="number" inputProps={{ min: 0, step: 0.01 }} helperText="Flatarmál íbúðar í fermetrum" fullWidth />
                    <ShareField label="Matshlutfall (%)" value={share} onChange={setShare} helperText="Matshluti hverrar íbúðar skv. eignaskiptasamningi" error={shareOver} />
                    {shareOver && <Alert severity="error" sx={{ mt: -1 }}>Heildarhlutfall (share) myndi fara yfir 100%</Alert>}
                    <Box>
                        <ShareField label="Matshlutfall hita (%)" value={eff2} onChange={setShare2} helperText="Matshluti hita skv. eignaskiptasamningi" error={share2Over} disabled={share2Same} />
                        <SameShareCheckbox checked={share2Same} onChange={setShare2Same} />
                    </Box>
                    {share2Over && <Alert severity="error" sx={{ mt: -1 }}>Heildarhlutfall (share 2) myndi fara yfir 100%</Alert>}
                    <Box>
                        <ShareField label="Matshlutfall lóðar (%)" value={eff3} onChange={setShare3} helperText="Matshluti lóðar skv. eignaskiptasamningi" error={share3Over} disabled={share3Same} />
                        <SameShareCheckbox checked={share3Same} onChange={setShare3Same} />
                    </Box>
                    {share3Over && <Alert severity="error" sx={{ mt: -1 }}>Heildarhlutfall (share 3) myndi fara yfir 100%</Alert>}
                    {error && <Alert severity="error">{error}</Alert>}
                </DialogContent>
                <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
                    <Box>
                        {!isDisabled && (
                            <Button sx={{ ...destructiveButtonSx, fontSize: '0.8rem' }} onClick={() => setConfirmDelete(true)}>
                                Óvirkja íbúð
                            </Button>
                        )}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button sx={ghostButtonSx} onClick={onClose}>Hætta við</Button>
                        <Button variant="contained" sx={primaryButtonSx} disabled={!isValid || saving} onClick={isDisabled ? handleEnable : handleSave}>
                            {saving ? <CircularProgress size={18} color="inherit" /> : isDisabled ? 'Virkja íbúð' : 'Vista'}
                        </Button>
                    </Box>
                </DialogActions>
            </Dialog>

            <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Óvirkja íbúð</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Ertu viss um að þú viljir óvirkja íbúð <strong>{apt.anr}</strong>?
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button sx={ghostButtonSx} onClick={() => setConfirmDelete(false)}>Hætta við</Button>
                    <Button sx={destructiveButtonSx} disabled={deleting} onClick={handleDisable}>
                        {deleting ? <CircularProgress size={18} color="inherit" /> : 'Já, óvirkja'}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}

function OwnerDialog({ open, onClose, apt, userId, onChanged }) {
    const { assocParam } = React.useContext(UserContext);
    const [kennitala, setKennitala] = useState('');
    const [share, setShare] = useState('');
    const [isPayer, setIsPayer] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    React.useEffect(() => {
        if (open) { setKennitala(''); setShare(''); setIsPayer(false); setError(''); }
    }, [open]);

    const existingSum = apt.owners.reduce((s, o) => s + parseFloat(o.share || 0), 0);
    const shareOver = parseFloat(share) > 0 && existingSum + parseFloat(share) > 100;
    const isValid = kennitala.length === 10 && parseFloat(share) > 0 && !shareOver;

    const handleAdd = async () => {
        setError(''); setSaving(true);
        try {
            const resp = await apiFetch(`${API_URL}/Owner${assocParam}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId, kennitala, apartment_id: apt.id, share: parseFloat(share), is_payer: isPayer }),
            });
            if (resp.ok) { onChanged(); }
            else { const d = await resp.json(); setError(d.detail || 'Villa við skráningu.'); }
        } catch { setError('Tenging við þjón mistókst.'); }
        finally { setSaving(false); }
    };

    const handleRemove = async (ownerId) => {
        try { await apiFetch(`${API_URL}/Owner/delete/${ownerId}`, { method: 'DELETE' }); onChanged(); }
        catch { /* ignore */ }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>Eigendur — {apt.anr}</DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
                {apt.owners.length === 0 ? (
                    <Typography color="text.secondary" variant="body2">Enginn eigandi skráður.</Typography>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {apt.owners.map(o => (
                            <Box key={o.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Box>
                                    <Typography variant="body2" fontWeight={500}>{o.name}</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {fmtKennitala(o.kennitala)} · {o.share}%{o.is_payer ? ' · Greiðandi' : ''}
                                    </Typography>
                                </Box>
                                <Button size="small" sx={destructiveButtonSx} onClick={() => handleRemove(o.id)}>Fjarlægja</Button>
                            </Box>
                        ))}
                        <Typography variant="caption" color="text.secondary">
                            Núverandi hlutfall: {fmtPct(existingSum)} / 100%
                        </Typography>
                    </Box>
                )}
                <Divider />
                <Typography variant="subtitle2">Bæta við eiganda</Typography>
                <TextField
                    label="Kennitala eiganda"
                    value={kennitala}
                    onChange={e => setKennitala(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    inputProps={{ inputMode: 'numeric', maxLength: 10 }}
                    helperText={`${kennitala.length}/10`}
                    size="small" fullWidth
                />
                <TextField
                    label="Hlutfall (%)"
                    value={share}
                    onChange={e => setShare(e.target.value.replace(/[^0-9.]/g, ''))}
                    size="small" type="number"
                    inputProps={{ min: 0, max: 100, step: 0.01 }}
                    helperText="Hlutdeild þessa eiganda í íbúðinni"
                    error={shareOver} fullWidth
                />
                {shareOver && <Alert severity="error">Heildarhlutfall eigenda myndi fara yfir 100% fyrir þessa íbúð.</Alert>}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                        component="button"
                        onClick={() => setIsPayer(v => !v)}
                        sx={{
                            border: isPayer ? `1.5px solid ${GREEN}` : `1px solid ${BORDER}`,
                            background: isPayer ? 'rgba(8,192,118,0.08)' : 'transparent',
                            color: isPayer ? GREEN : 'text.secondary',
                            borderRadius: 999, px: 1.5, py: '3px',
                            fontSize: 12.5, cursor: 'pointer', fontWeight: isPayer ? 600 : 400,
                        }}
                    >
                        Greiðandi
                    </Box>
                    <Typography variant="caption" color="text.secondary">Merkja sem greiðanda reikninga</Typography>
                </Box>
                {error && <Alert severity="error">{error}</Alert>}
            </DialogContent>
            <DialogActions>
                <Button sx={ghostButtonSx} onClick={onClose}>Loka</Button>
                <Button variant="contained" sx={primaryButtonSx} disabled={!isValid || saving} onClick={handleAdd}>
                    {saving ? <CircularProgress size={18} color="inherit" /> : 'Skrá eiganda'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default ApartmentsPage;
