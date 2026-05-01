import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Typography, CircularProgress, Paper,
    Table, TableHead, TableRow, TableCell, TableBody,
    Button, TextField, IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions,
    Alert, Collapse, Tooltip, DialogContentText,
    MenuItem, Select, FormControl, InputLabel,
    InputAdornment,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useHelp } from '../ui/HelpContext';
import { UserContext } from './UserContext';
import { apiFetch } from '../api';
import SideBar from './Sidebar';
import { fmtPct, fmtKennitala, fmtPhone } from '../format';
import { useSort, HEAD_SX, HEAD_CELL_SX } from './tableUtils';
import { primaryButtonSx, ghostButtonSx, destructiveButtonSx } from '../ui/buttons';
import { LabelChip } from '../ui/chips';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8010';

/* ── Dialog primitives ────────────────────────────────────────── */
const DLGBORDER   = '#e8e8e8';
const DLGNAVY     = '#1D366F';
const DLGNAVYTINT = '#eef1f8';
const DLGGREEN    = '#08C076';
const DLGGREENTINT = '#e8f5e9';
const DLGTEXT2    = '#555';
const DLGDIS      = '#888';
const DLGWARN     = '#e65100';
const DLGPOS      = '#2e7d32';
const DLGBGTB     = '#fafafa';

const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase();
};

function DlgSection({ children, hint }) {
    return (
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 2.5, mb: 1.25 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: DLGDIS }}>
                {children}
            </span>
            {hint && <span style={{ fontSize: 12, color: DLGTEXT2 }}>{hint}</span>}
        </Box>
    );
}

function CtxChip({ children, color = 'navy' }) {
    const bg = color === 'green' ? DLGGREENTINT : DLGNAVYTINT;
    const fg = color === 'green' ? DLGPOS : DLGNAVY;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '3px 9px', borderRadius: 999, background: bg, color: fg,
            fontSize: 11.5, fontWeight: 600,
        }}>
            {children}
        </span>
    );
}

function OwnersPage() {
    const navigate = useNavigate();
    const { user, assocParam } = React.useContext(UserContext);
    const { openHelp } = useHelp();
    const [ownerships, setOwnerships] = useState(undefined);
    const [apartments, setApartments] = useState([]);
    const [error, setError] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [showDisabled, setShowDisabled] = useState(false);
    const { sort, lbl } = useSort('name');

    useEffect(() => {
        if (!user) { navigate('/login'); return; }
        loadAll();
    }, [user, assocParam]); // eslint-disable-line react-hooks/exhaustive-deps

    const loadAll = async () => {
        try {
            const [ownRes, aptRes] = await Promise.all([
                apiFetch(`${API_URL}/Owner/${user.id}${assocParam}`),
                apiFetch(`${API_URL}/Apartment/${user.id}${assocParam}`),
            ]);
            if (ownRes.ok) setOwnerships(await ownRes.json());
            else { setError('Villa við að sækja eigendur.'); setOwnerships([]); }
            if (aptRes.ok) {
                const apts = await aptRes.json();
                setApartments(apts.filter(a => !a.deleted));
            }
        } catch {
            setError('Tenging við þjón mistókst.');
            setOwnerships([]);
        }
    };

    if (ownerships === undefined) {
        return (
            <div className="dashboard">
                <SideBar />
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8, flex: 1 }}>
                    <CircularProgress color="secondary" />
                </Box>
            </div>
        );
    }

    const active = ownerships.filter(o => !o.deleted);
    const disabled = ownerships.filter(o => o.deleted);

    return (
        <div className="dashboard">
            <SideBar />
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
                {/* Zone 1: Header */}
                <Box sx={{ px: 3, py: 2, background: '#fff', borderBottom: '1px solid #e8e8e8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                    <Box>
                        <Typography variant="h5">Eigendur</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Button variant="contained" sx={primaryButtonSx} onClick={() => setShowForm(true)}>
                            + Bæta við eiganda
                        </Button>
                        <Tooltip title="Hjálp">
                            <IconButton size="small" onClick={() => openHelp('eigendur')}>
                                <HelpOutlineIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Box>
                {/* Zone 3: Content (no toolbar needed — no filters) */}
                <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
                    <AddOwnerDialog
                        open={showForm}
                        onClose={() => setShowForm(false)}
                        userId={user.id}
                        assocParam={assocParam}
                        apartments={apartments}
                        ownerships={active}
                        onCreated={() => { setShowForm(false); loadAll(); }}
                    />

                    {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

                    {active.length === 0 ? (
                        <Typography color="text.secondary" sx={{ mt: 4 }}>
                            Enginn eigandi skráður. Smelltu á „+ Bæta við eiganda" til að hefja skráningu.
                        </Typography>
                    ) : (
                        <Paper variant="outlined" sx={{ mt: 2 }}>
                            <Table size="small">
                                <TableHead sx={HEAD_SX}>
                                    <TableRow>
                                        <TableCell sx={HEAD_CELL_SX}>{lbl('name', 'Nafn')}</TableCell>
                                        <TableCell sx={HEAD_CELL_SX}>{lbl('kennitala', 'Kennitala')}</TableCell>
                                        <TableCell sx={HEAD_CELL_SX}>{lbl('email', 'Netfang')}</TableCell>
                                        <TableCell sx={HEAD_CELL_SX}>{lbl('phone', 'Símanúmer')}</TableCell>
                                        <TableCell sx={HEAD_CELL_SX}>{lbl('anr', 'Íbúð')}</TableCell>
                                        <TableCell sx={HEAD_CELL_SX}>{lbl('share', 'Hlutfall (%)')}</TableCell>
                                        <TableCell sx={HEAD_CELL_SX}>{lbl('is_payer', 'Greiðandi')}</TableCell>
                                        <TableCell />
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {sort(active).map(o => (
                                        <OwnerRow
                                            key={o.id}
                                            ownership={o}
                                            ownerships={active}
                                            onSaved={loadAll}
                                        />
                                    ))}
                                </TableBody>
                            </Table>
                        </Paper>
                    )}

                    {disabled.length > 0 && (
                        <Box sx={{ mt: 3 }}>
                            <Button
                                size="small" sx={{ ...ghostButtonSx, p: 0, minWidth: 0 }}
                                onClick={() => setShowDisabled(v => !v)}
                            >
                                {showDisabled ? '▲' : '▼'} Óvirkir eigendur ({disabled.length})
                            </Button>
                            <Collapse in={showDisabled}>
                                <Paper variant="outlined" sx={{ mt: 1 }}>
                                    <Table size="small">
                                        <TableHead sx={HEAD_SX}>
                                            <TableRow>
                                                <TableCell sx={HEAD_CELL_SX}>Nafn</TableCell>
                                                <TableCell sx={HEAD_CELL_SX}>Kennitala</TableCell>
                                                <TableCell sx={HEAD_CELL_SX}>Netfang</TableCell>
                                                <TableCell sx={HEAD_CELL_SX}>Símanúmer</TableCell>
                                                <TableCell sx={HEAD_CELL_SX}>Íbúð</TableCell>
                                                <TableCell sx={HEAD_CELL_SX}>Hlutfall (%)</TableCell>
                                                <TableCell />
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {sort(disabled).map(o => (
                                                <OwnerRow
                                                    key={o.id}
                                                    ownership={o}
                                                    ownerships={active}
                                                    onSaved={loadAll}
                                                    isDisabled
                                                />
                                            ))}
                                        </TableBody>
                                    </Table>
                                </Paper>
                            </Collapse>
                        </Box>
                    )}
                </Box>
            </Box>
        </div>
    );
}

function AddOwnerDialog({ open, onClose, userId, assocParam, apartments, ownerships, onCreated }) {
    const [kennitala, setKennitala] = useState('');
    const [apartmentId, setApartmentId] = useState('');
    const [share, setShare] = useState('');
    const [isPayer, setIsPayer] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    React.useEffect(() => {
        if (!open) { setKennitala(''); setApartmentId(''); setShare(''); setIsPayer(false); setError(''); }
    }, [open]);

    const selectedApt = apartments.find(a => String(a.id) === String(apartmentId));
    const aptOwners = ownerships.filter(o => String(o.apartment_id) === String(apartmentId));
    const existingSum = aptOwners.reduce((s, o) => s + parseFloat(o.share || 0), 0);
    const round2 = n => Math.round(n * 100) / 100;
    const shareOver = parseFloat(share) > 0 && round2(existingSum + parseFloat(share)) > 100;
    const isValid = kennitala.length === 10 && apartmentId && parseFloat(share) > 0 && !shareOver;
    const newSharePct = parseFloat(share) || 0;
    const remaining = round2(100 - existingSum);
    const currentPayer = aptOwners.find(o => o.is_payer);

    const handleSubmit = async () => {
        setError('');
        setSaving(true);
        try {
            const resp = await apiFetch(`${API_URL}/Owner${assocParam}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: userId, kennitala,
                    apartment_id: apartmentId,
                    share: parseFloat(share), is_payer: isPayer,
                }),
            });
            if (resp.ok) { onCreated(); }
            else { const data = await resp.json(); setError(data.detail || 'Villa við skráningu.'); }
        } catch {
            setError('Tenging við þjón mistókst.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth={false}
            PaperProps={{ sx: { width: 620, maxWidth: '95vw', borderRadius: '12px', overflow: 'hidden' } }}
        >
            {/* Header */}
            <Box sx={{ p: '20px 24px 16px', borderBottom: `1px solid ${DLGBORDER}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', gap: 1, mb: 0.75, alignItems: 'center' }}>
                        <CtxChip color="green">Nýr eigandi</CtxChip>
                    </Box>
                    <Typography sx={{ fontSize: 20, fontWeight: 600, lineHeight: 1.25 }}>Skrá nýjan eiganda</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Sláðu inn kennitölu — nafn er sótt sjálfkrafa úr Þjóðskrá.
                    </Typography>
                </Box>
                <IconButton size="small" onClick={onClose} sx={{ mt: -0.5 }}>
                    <CloseIcon sx={{ fontSize: 20 }} />
                </IconButton>
            </Box>

            {/* Body */}
            <Box sx={{ p: '20px 24px', overflowY: 'auto' }}>
                <DlgSection>① Þjóðskrárfletting</DlgSection>
                <TextField
                    label="Kennitala"
                    value={kennitala}
                    onChange={e => setKennitala(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    inputProps={{ inputMode: 'numeric', maxLength: 10, style: { fontFamily: 'monospace' } }}
                    InputProps={{ endAdornment: <InputAdornment position="end">{kennitala.length}/10</InputAdornment> }}
                    size="small" fullWidth
                    helperText="10 tölustafir — bandstrik er valfrjálst"
                />

                <DlgSection>② Tenging við íbúð</DlgSection>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 1.5 }}>
                    <FormControl size="small" fullWidth>
                        <InputLabel>Íbúð</InputLabel>
                        <Select value={apartmentId} label="Íbúð" onChange={e => { setApartmentId(e.target.value); setShare(''); }}>
                            {apartments.map(a => (
                                <MenuItem key={a.id} value={a.id}>{a.anr}{a.size ? ` — ${a.size} m²` : ''}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <TextField
                        label="Hlutfall"
                        value={share}
                        onChange={e => setShare(e.target.value.replace(/[^0-9.]/g, ''))}
                        size="small" type="number"
                        inputProps={{ min: 0, max: 100, step: 0.01 }}
                        InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                        helperText={apartmentId ? `Eftir: ${round2(remaining - newSharePct).toFixed(2)}%` : '—'}
                        error={shareOver} fullWidth disabled={!apartmentId}
                    />
                </Box>

                {apartmentId && (existingSum > 0 || newSharePct > 0) && (
                    <Box sx={{ mt: 1.5, p: '10px 14px', border: `1px solid ${DLGBORDER}`, borderRadius: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75, fontSize: '11.5px', color: DLGTEXT2, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                            <span>Skipting í íbúð {selectedApt?.anr} eftir vistun</span>
                            <span style={{ color: round2(existingSum + newSharePct) === 100 ? DLGPOS : DLGWARN }}>
                                {round2(existingSum + newSharePct).toFixed(2)}%
                            </span>
                        </Box>
                        <Box sx={{ height: 10, borderRadius: 999, overflow: 'hidden', background: '#f3f4f6', display: 'flex' }}>
                            {aptOwners.map((o, i) => (
                                <div key={o.id} style={{ width: `${parseFloat(o.share)}%`, background: i % 2 === 0 ? DLGNAVY : '#3d5a9f' }} />
                            ))}
                            {newSharePct > 0 && <div style={{ width: `${newSharePct}%`, background: DLGGREEN }} />}
                        </Box>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '3px 10px', mt: 0.75, fontSize: '11.5px' }}>
                            {aptOwners.map((o, i) => (
                                <span key={o.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: DLGTEXT2 }}>
                                    <span style={{ width: 8, height: 8, borderRadius: 2, background: i % 2 === 0 ? DLGNAVY : '#3d5a9f', display: 'inline-block' }} />
                                    {o.name} · {parseFloat(o.share).toFixed(2)}%
                                </span>
                            ))}
                            {newSharePct > 0 && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                    <span style={{ width: 8, height: 8, borderRadius: 2, background: DLGGREEN, display: 'inline-block' }} />
                                    Nýr eigandi · {newSharePct.toFixed(2)}%
                                </span>
                            )}
                        </Box>
                    </Box>
                )}

                <DlgSection>③ Greiðandi reikninga</DlgSection>
                <Box sx={{ display: 'flex', gap: 1, opacity: !apartmentId ? 0.55 : 1 }}>
                    {[
                        {
                            val: false,
                            label: 'Ekki greiðandi',
                            sub: currentPayer ? `${currentPayer.name} er enn greiðandi` : 'Enginn greiðandi skráður',
                        },
                        {
                            val: true,
                            label: 'Já — gera greiðanda',
                            sub: currentPayer ? `Tekur við af ${currentPayer.name}` : 'Þessi eigandi verður greiðandi',
                        },
                    ].map(opt => (
                        <Box
                            key={String(opt.val)}
                            onClick={() => apartmentId && setIsPayer(opt.val)}
                            sx={{
                                flex: 1, p: '12px 14px', cursor: apartmentId ? 'pointer' : 'default', borderRadius: 2,
                                border: `${isPayer === opt.val ? '1.5px' : '1px'} solid ${isPayer === opt.val ? DLGNAVY : DLGBORDER}`,
                                background: isPayer === opt.val ? DLGNAVYTINT : '#fff',
                                display: 'flex', alignItems: 'center', gap: 1.25,
                            }}
                        >
                            <span style={{
                                width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                                border: `2px solid ${isPayer === opt.val ? DLGNAVY : DLGBORDER}`,
                                background: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                {isPayer === opt.val && <span style={{ width: 8, height: 8, borderRadius: '50%', background: DLGNAVY }} />}
                            </span>
                            <div>
                                <div style={{ fontSize: 13.5, fontWeight: 500 }}>{opt.label}</div>
                                <div style={{ fontSize: 11.5, color: DLGTEXT2 }}>{opt.sub}</div>
                            </div>
                        </Box>
                    ))}
                </Box>

                {shareOver && <Alert severity="error" sx={{ mt: 1.5 }}>Heildarhlutfall eigenda myndi fara yfir 100% fyrir þessa íbúð.</Alert>}
                {error && <Alert severity="error" sx={{ mt: 1.5 }}>{error}</Alert>}
            </Box>

            {/* Footer */}
            <Box sx={{ p: '14px 20px', borderTop: `1px solid ${DLGBORDER}`, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                <Button sx={ghostButtonSx} onClick={onClose}>Hætta við</Button>
                <Button variant="contained" sx={primaryButtonSx} disabled={!isValid || saving} onClick={handleSubmit}>
                    {saving ? <CircularProgress size={18} color="inherit" /> : 'Skrá eiganda'}
                </Button>
            </Box>
        </Dialog>
    );
}

function OwnerRow({ ownership, ownerships, onSaved, isDisabled }) {
    const [editOpen, setEditOpen] = useState(false);

    return (
        <>
            <TableRow hover sx={isDisabled ? { opacity: 0.55 } : {}}>
                <TableCell>{ownership.name}</TableCell>
                <TableCell>{fmtKennitala(ownership.kennitala)}</TableCell>
                <TableCell>
                    {ownership.email
                        ? <a href={`mailto:${ownership.email}`} style={{ color: '#1D366F', textDecoration: 'underline' }}>{ownership.email}</a>
                        : <span style={{ color: '#bbb' }}>—</span>}
                </TableCell>
                <TableCell>
                    {ownership.phone
                        ? <a href={`tel:${ownership.phone.replace(/\s/g, '')}`} style={{ color: '#1D366F', textDecoration: 'underline' }}>{fmtPhone(ownership.phone)}</a>
                        : <span style={{ color: '#bbb' }}>—</span>}
                </TableCell>
                <TableCell>{ownership.anr}</TableCell>
                <TableCell>{ownership.share}%</TableCell>
                {!isDisabled && (
                    <TableCell>
                        {ownership.is_payer && <LabelChip label="Greiðandi" />}
                    </TableCell>
                )}
                <TableCell align="right" sx={{ width: 48 }}>
                    <Tooltip title={isDisabled ? 'Virkja / breyta' : 'Breyta'}>
                        <IconButton size="small" onClick={() => setEditOpen(true)}>
                            <EditIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </TableCell>
            </TableRow>

            <EditOwnerDialog
                open={editOpen}
                onClose={() => setEditOpen(false)}
                ownership={ownership}
                ownerships={ownerships}
                isDisabled={isDisabled}
                onSaved={() => { setEditOpen(false); onSaved(); }}
                onDisabled={() => { setEditOpen(false); onSaved(); }}
            />
        </>
    );
}

function EditOwnerDialog({ open, onClose, ownership, ownerships, isDisabled, onSaved, onDisabled }) {
    const { user, setUser } = React.useContext(UserContext);
    const [name, setName] = useState(ownership.name || '');
    const [share, setShare] = useState(String(ownership.share));
    const [isPayer, setIsPayer] = useState(ownership.is_payer);
    const [email, setEmail] = useState(ownership.email || '');
    const [phone, setPhone] = useState(ownership.phone || '');
    const [saving, setSaving] = useState(false);
    const [disabling, setDisabling] = useState(false);
    const [confirmDisable, setConfirmDisable] = useState(false);
    const [error, setError] = useState('');

    React.useEffect(() => {
        if (open) {
            setName(ownership.name || '');
            setShare(String(ownership.share));
            setIsPayer(ownership.is_payer);
            setEmail(ownership.email || '');
            setPhone(ownership.phone || '');
            setError('');
        }
    }, [open, ownership]);

    const others = ownerships.filter(o => o.id !== ownership.id && o.apartment_id === ownership.apartment_id);
    const otherSum = others.reduce((s, o) => s + parseFloat(o.share || 0), 0);
    const round2 = n => Math.round(n * 100) / 100;
    const shareOver = parseFloat(share) > 0 && round2(otherSum + parseFloat(share)) > 100;
    const totalShare = round2(otherSum + parseFloat(share || 0));

    const emailValid = !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    const phoneValid = !phone || /^(\+\d{1,3}[\s-]?)?\d{3}[\s]?\d{4}$/.test(phone.trim());
    const isValid = name.trim().length > 0 && parseFloat(share) > 0 && !shareOver && emailValid && phoneValid;

    const handleSave = async () => {
        setError('');
        setSaving(true);
        const url = isDisabled
            ? `${API_URL}/Owner/enable/${ownership.id}`
            : `${API_URL}/Owner/update/${ownership.id}`;
        const method = isDisabled ? 'PATCH' : 'PUT';
        try {
            const [ownerResp, userResp] = await Promise.all([
                apiFetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ share: parseFloat(share), is_payer: isPayer }),
                }),
                apiFetch(`${API_URL}/User/${ownership.user_id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: name.trim(), email: email.trim(), phone: fmtPhone(phone) }),
                }),
            ]);
            if (ownerResp.ok && userResp.ok) {
                if (user && ownership.user_id === user.id) {
                    const updatedUser = { ...user, name: name.trim(), email: email.trim() || null, phone: fmtPhone(phone) || null };
                    localStorage.setItem('user', JSON.stringify(updatedUser));
                    setUser(updatedUser);
                }
                onSaved();
            } else {
                const data = ownerResp.ok ? await userResp.json() : await ownerResp.json();
                setError(data.detail || 'Villa við uppfærslu.');
            }
        } catch {
            setError('Tenging við þjón mistókst.');
        } finally {
            setSaving(false);
        }
    };

    const handleDisable = async () => {
        setDisabling(true);
        try {
            const resp = await apiFetch(`${API_URL}/Owner/delete/${ownership.id}`, { method: 'DELETE' });
            if (resp.ok) { setConfirmDisable(false); onDisabled(); }
            else { const data = await resp.json(); setError(data.detail || 'Villa við óvirkjun.'); setConfirmDisable(false); }
        } catch {
            setError('Tenging við þjón mistókst.'); setConfirmDisable(false);
        } finally {
            setDisabling(false);
        }
    };

    const otherPayer = others.find(o => o.is_payer);

    return (
        <>
        <Dialog open={open} onClose={onClose} maxWidth={false}
            PaperProps={{ sx: { width: 560, maxWidth: '95vw', borderRadius: '12px', overflow: 'hidden' } }}
        >
            {/* Header */}
            <Box sx={{ p: '20px 24px 16px', borderBottom: `1px solid ${DLGBORDER}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', gap: 1, mb: 0.75, alignItems: 'center' }}>
                        <CtxChip>Eigandi</CtxChip>
                        <CtxChip>Íbúð {ownership.anr}</CtxChip>
                    </Box>
                    <Typography sx={{ fontSize: 20, fontWeight: 600, lineHeight: 1.25 }}>
                        {isDisabled ? 'Óvirkur eigandi' : (ownership.name || 'Eigandi')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Kennitala {fmtKennitala(ownership.kennitala)}
                    </Typography>
                </Box>
                <IconButton size="small" onClick={onClose} sx={{ mt: -0.5 }}>
                    <CloseIcon sx={{ fontSize: 20 }} />
                </IconButton>
            </Box>

            {/* Body */}
            <Box sx={{ p: '20px 24px', overflowY: 'auto' }}>
                {/* Identity card */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: '12px 14px', border: `1px solid ${DLGBORDER}`, borderRadius: 2, background: DLGBGTB, mb: 0.5 }}>
                    <Box sx={{ width: 44, height: 44, borderRadius: '50%', background: DLGNAVYTINT, color: DLGNAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 14, flexShrink: 0 }}>
                        {getInitials(ownership.name)}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontSize: 14, fontWeight: 500, lineHeight: 1.3 }}>{ownership.name}</Typography>
                        <Typography sx={{ fontSize: 12, color: DLGTEXT2, fontFamily: 'monospace', mt: 0.25 }}>{fmtKennitala(ownership.kennitala)}</Typography>
                    </Box>
                </Box>

                <DlgSection hint="Breytast oft — hafa engin áhrif á reikningagerð">Samskipti</DlgSection>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <TextField
                        label="Nafn"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        size="small" fullWidth
                        error={name.trim().length === 0}
                        helperText={name.trim().length === 0 ? 'Nafn má ekki vera tómt' : ''}
                    />
                    <TextField
                        label="Netfang"
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        size="small" fullWidth
                        error={!!email && !emailValid}
                        helperText={!!email && !emailValid ? 'Netfang verður að innihalda @ og lén' : ''}
                    />
                    <TextField
                        label="Símanúmer"
                        value={phone}
                        onChange={e => setPhone(e.target.value.replace(/[^0-9+\s-]/g, ''))}
                        size="small" fullWidth
                        inputProps={{ inputMode: 'tel' }}
                        error={!!phone && !phoneValid}
                        helperText={!!phone && !phoneValid ? 'Símanúmer: 7 tölustafir (t.d. 555 1234)' : ''}
                    />
                </Box>

                <DlgSection hint="Hvernig sameiginlegur kostnaður skiptist innan íbúðar">Hlutdeild í íbúð</DlgSection>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, alignItems: 'start' }}>
                    <TextField
                        label="Hlutfall"
                        value={share}
                        onChange={e => setShare(e.target.value.replace(/[^0-9.]/g, ''))}
                        size="small" type="number"
                        inputProps={{ min: 0, max: 100, step: 0.01 }}
                        InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                        error={shareOver}
                        helperText={shareOver ? 'Fer yfir 100%' : `Aðrir: ${fmtPct(otherSum)} / 100%`}
                        fullWidth
                    />
                    <Box sx={{ p: '10px 12px', border: `1px dashed ${DLGBORDER}`, borderRadius: 1, background: DLGBGTB }}>
                        <Box sx={{ fontSize: '11px', color: DLGDIS, letterSpacing: '0.06em', textTransform: 'uppercase', mb: 0.75 }}>Aðrir í íbúð</Box>
                        {others.length === 0 ? (
                            <Box sx={{ fontSize: 13, color: DLGDIS }}>Enginn annar</Box>
                        ) : (
                            others.map(o => (
                                <Box key={o.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                                    <Box sx={{ width: 18, height: 18, borderRadius: '50%', background: DLGGREENTINT, color: DLGPOS, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700, flexShrink: 0 }}>
                                        {getInitials(o.name)}
                                    </Box>
                                    <Box sx={{ flex: 1, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.name}</Box>
                                    <Box sx={{ fontSize: 13, fontFamily: 'monospace', color: DLGTEXT2, flexShrink: 0 }}>{parseFloat(o.share).toFixed(2)}%</Box>
                                </Box>
                            ))
                        )}
                        <Box sx={{ mt: 0.75, fontSize: '11.5px', color: totalShare === 100 ? DLGPOS : DLGWARN, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {totalShare === 100 ? '✓' : '!'} Samtals {totalShare.toFixed(2)}%
                        </Box>
                    </Box>
                </Box>
                {shareOver && <Alert severity="error" sx={{ mt: 1 }}>Heildarhlutfall myndi fara yfir 100% fyrir þessa íbúð.</Alert>}

                <DlgSection>Greiðandi reikninga</DlgSection>
                <Box sx={{ display: 'flex', border: `1px solid ${DLGBORDER}`, borderRadius: 2, overflow: 'hidden' }}>
                    {[
                        { val: true,  label: 'Já — fær reikninga', sub: 'Núverandi greiðandi' },
                        {
                            val: false,
                            label: 'Nei',
                            sub: otherPayer ? `${otherPayer.name} verður greiðandi` : (others.length > 0 ? 'Enginn annar greiðandi' : 'Enginn greiðandi í íbúð'),
                        },
                    ].map((opt, i) => (
                        <Box
                            key={String(opt.val)}
                            onClick={() => setIsPayer(opt.val)}
                            sx={{
                                flex: 1, p: '12px 14px', cursor: 'pointer',
                                background: isPayer === opt.val ? DLGGREENTINT : '#fff',
                                borderRight: i === 0 ? `1px solid ${DLGBORDER}` : 'none',
                                display: 'flex', alignItems: 'center', gap: 1.25,
                            }}
                        >
                            <span style={{
                                width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                                border: `2px solid ${isPayer === opt.val ? DLGGREEN : DLGBORDER}`,
                                background: isPayer === opt.val ? DLGGREEN : '#fff',
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                {isPayer === opt.val && <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>✓</span>}
                            </span>
                            <div>
                                <div style={{ fontSize: 13.5, fontWeight: 500 }}>{opt.label}</div>
                                <div style={{ fontSize: 11.5, color: DLGTEXT2 }}>{opt.sub}</div>
                            </div>
                        </Box>
                    ))}
                </Box>

                {error && <Alert severity="error" sx={{ mt: 1.5 }}>{error}</Alert>}
            </Box>

            {/* Danger zone — only for active owners */}
            {!isDisabled && (
                <Box sx={{ borderTop: `1px solid ${DLGBORDER}`, p: '12px 24px', background: DLGBGTB, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
                    <Box>
                        <Typography sx={{ fontSize: 13, fontWeight: 500 }}>Óvirkja eiganda</Typography>
                        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                            Notað þegar eigandi flytur. Gamlir reikningar haldast.
                        </Typography>
                    </Box>
                    <button
                        onClick={() => setConfirmDisable(true)}
                        style={{ background: 'transparent', border: `1px solid ${DLGBORDER}`, color: '#c62828', padding: '6px 12px', borderRadius: 4, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
                    >
                        Óvirkja
                    </button>
                </Box>
            )}

            {/* Footer */}
            <Box sx={{ p: '14px 20px', borderTop: `1px solid ${DLGBORDER}`, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                <Button sx={ghostButtonSx} onClick={onClose}>Hætta við</Button>
                <Button variant="contained" sx={primaryButtonSx} disabled={!isValid || saving} onClick={handleSave}>
                    {saving ? <CircularProgress size={18} color="inherit" /> : isDisabled ? 'Virkja eiganda' : 'Vista breytingar'}
                </Button>
            </Box>
        </Dialog>

        <Dialog open={confirmDisable} onClose={() => setConfirmDisable(false)} maxWidth="xs" fullWidth>
            <DialogTitle>Óvirkja eiganda</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    Ertu viss um að þú viljir óvirkja eigandann <strong>{ownership.name}</strong> á íbúð <strong>{ownership.anr}</strong>?
                </DialogContentText>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button sx={ghostButtonSx} onClick={() => setConfirmDisable(false)}>Hætta við</Button>
                <Button sx={destructiveButtonSx} disabled={disabling} onClick={handleDisable}>
                    {disabling ? <CircularProgress size={18} color="inherit" /> : 'Já, óvirkja'}
                </Button>
            </DialogActions>
        </Dialog>
        </>
    );
}

export default OwnersPage;
