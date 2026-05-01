import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Typography, CircularProgress, Paper,
    Table, TableHead, TableRow, TableCell, TableBody, TableFooter,
    Button, TextField, Collapse, Chip, IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions,
    Alert, Tooltip, DialogContentText,
    InputAdornment,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useHelp } from '../ui/HelpContext';
import { UserContext } from './UserContext';
import { apiFetch } from '../api';
import SideBar from './Sidebar';
import { fmtPct } from '../format';
import { useSort, HEAD_SX, HEAD_CELL_SX } from './tableUtils';
import { primaryButtonSx, secondaryButtonSx, ghostButtonSx, destructiveButtonSx } from '../ui/buttons';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8010';

function ApartmentsPage() {
    const navigate = useNavigate();
    const { user, assocParam } = React.useContext(UserContext);
    const { openHelp } = useHelp();
    const [apartments, setApartments] = useState(undefined);
    const [error, setError] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [showDisabled, setShowDisabled] = useState(false);
    const { sort, lbl } = useSort('anr');

    useEffect(() => {
        if (!user) { navigate('/login'); return; }
        loadApartments();
    }, [user, assocParam]); // eslint-disable-line react-hooks/exhaustive-deps

    const loadApartments = async () => {
        try {
            const resp = await apiFetch(`${API_URL}/Apartment/${user.id}${assocParam}`);
            if (resp.ok) {
                setApartments(await resp.json());
            } else {
                setError('Villa við að sækja íbúðir.');
                setApartments([]);
            }
        } catch {
            setError('Tenging við þjón mistókst.');
            setApartments([]);
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

    return (
        <div className="dashboard">
            <SideBar />
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
                {/* Zone 1: Header */}
                <Box sx={{ px: 3, py: 2, background: '#fff', borderBottom: '1px solid #e8e8e8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                    <Typography variant="h5">Íbúðir</Typography>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Button
                            variant="outlined"
                            sx={secondaryButtonSx}
                            onClick={() => navigate('/ibudir/innflutningur')}
                        >
                            ⬇ Innflutningur
                        </Button>
                        <Button
                            variant="contained"
                            sx={primaryButtonSx}
                            onClick={() => setShowForm(true)}
                        >
                            + Bæta við íbúð
                        </Button>
                        <Tooltip title="Hjálp">
                            <IconButton size="small" onClick={() => openHelp('ibudir')}>
                                <HelpOutlineIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Box>

                {/* Zone 3: Content */}
                <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
                    <AddApartmentDialog
                        open={showForm}
                        onClose={() => setShowForm(false)}
                        userId={user.id}
                        assocParam={assocParam}
                        apartments={apartments.filter(a => !a.deleted)}
                        onCreated={(updated) => { setShowForm(false); setApartments(updated); }}
                    />

                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                    {(() => {
                        const active = apartments.filter(a => !a.deleted);
                        const disabled = apartments.filter(a => a.deleted);
                        return (
                            <>
                                {active.length === 0 ? (
                                    <Paper
                                        variant="outlined"
                                        sx={{ p: 3, borderColor: 'secondary.main', bgcolor: 'rgba(8,192,118,0.05)' }}
                                    >
                                        <Typography variant="subtitle1" color="secondary" sx={{ mb: 0.5 }}>
                                            Setja upp íbúðir sjálfkrafa
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                            Enginn búinn að skrá íbúðir. Notaðu HMS fasteignaskrána til að flytja inn lista yfir íbúðir sjálfkrafa.
                                        </Typography>
                                        <Button
                                            variant="contained"
                                            sx={primaryButtonSx}
                                            onClick={() => navigate('/ibudir/innflutningur')}
                                        >
                                            Flytja inn frá HMS →
                                        </Button>
                                    </Paper>
                                ) : (
                                    <Paper variant="outlined">
                                        <Table size="small">
                                            <TableHead sx={HEAD_SX}>
                                                <TableRow>
                                                    <TableCell sx={HEAD_CELL_SX}>{lbl('anr', 'Merking')}</TableCell>
                                                    <TableCell sx={HEAD_CELL_SX}>{lbl('fnr', 'Fastanúmer')}</TableCell>
                                                    <TableCell sx={HEAD_CELL_SX}>{lbl('size', 'Stærð (m²)')}</TableCell>
                                                    <TableCell sx={HEAD_CELL_SX}>{lbl('share', 'Hlutfall (%)')}</TableCell>
                                                    <TableCell sx={HEAD_CELL_SX}>{lbl('share_2', 'Hiti (%)')}</TableCell>
                                                    <TableCell sx={HEAD_CELL_SX}>{lbl('share_3', 'Lóð (%)')}</TableCell>
                                                    <TableCell sx={HEAD_CELL_SX}>Eigendur</TableCell>
                                                    <TableCell />
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {sort(active).map((apt) => (
                                                    <ApartmentRow
                                                        key={apt.id}
                                                        apt={apt}
                                                        apartments={active}
                                                        onOwnersChanged={loadApartments}
                                                        onSaved={loadApartments}
                                                    />
                                                ))}
                                            </TableBody>
                                            <TableFooter>
                                                <TableRow sx={{ '& td': { fontWeight: 600, borderTop: '2px solid rgba(0,0,0,0.12)', color: 'text.primary' } }}>
                                                    <TableCell>Samtals</TableCell>
                                                    <TableCell />
                                                    <TableCell>{active.reduce((s, a) => s + parseFloat(a.size || 0), 0).toFixed(2)} m²</TableCell>
                                                    <TableCell>{fmtPct(active.reduce((s, a) => s + parseFloat(a.share || 0), 0))}</TableCell>
                                                    <TableCell>{fmtPct(active.reduce((s, a) => s + parseFloat(a.share_2 || 0), 0))}</TableCell>
                                                    <TableCell>{fmtPct(active.reduce((s, a) => s + parseFloat(a.share_3 || 0), 0))}</TableCell>
                                                    <TableCell />
                                                    <TableCell />
                                                </TableRow>
                                            </TableFooter>
                                        </Table>
                                    </Paper>
                                )}

                                {disabled.length > 0 && (
                                    <Box sx={{ mt: 3 }}>
                                        <Button
                                            size="small"
                                            sx={{ ...ghostButtonSx, p: 0, minWidth: 0 }}
                                            onClick={() => setShowDisabled(v => !v)}
                                        >
                                            {showDisabled ? '▲' : '▼'} Óvirkar íbúðir ({disabled.length})
                                        </Button>
                                        <Collapse in={showDisabled}>
                                            <Paper variant="outlined" sx={{ mt: 1 }}>
                                                <Table size="small">
                                                    <TableHead sx={HEAD_SX}>
                                                        <TableRow>
                                                            <TableCell sx={HEAD_CELL_SX}>Merking</TableCell>
                                                            <TableCell sx={HEAD_CELL_SX}>Fastanúmer</TableCell>
                                                            <TableCell sx={HEAD_CELL_SX}>Stærð (m²)</TableCell>
                                                            <TableCell sx={HEAD_CELL_SX}>Matshlutfall (%)</TableCell>
                                                            <TableCell sx={HEAD_CELL_SX}>Hiti (%)</TableCell>
                                                            <TableCell sx={HEAD_CELL_SX}>Lóð (%)</TableCell>
                                                            <TableCell />
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {sort(disabled).map((apt) => (
                                                            <ApartmentRow
                                                                key={apt.id}
                                                                apt={apt}
                                                                apartments={active}
                                                                onOwnersChanged={loadApartments}
                                                                onSaved={loadApartments}
                                                                isDisabled
                                                            />
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </Paper>
                                        </Collapse>
                                    </Box>
                                )}
                            </>
                        );
                    })()}
                </Box>
            </Box>
        </div>
    );
}

/* ── Dialog primitives ────────────────────────────────────────── */

const DLGBORDER = '#e8e8e8';
const DLGNAVY   = '#1D366F';
const DLGNAVYTINT = '#eef1f8';
const DLGGREEN  = '#08C076';
const DLGGREENTINT = '#e8f5e9';
const DLGTEXT2  = '#555';
const DLGDIS    = '#888';
const DLGWARN   = '#e65100';
const DLGPOS    = '#2e7d32';
const DLGBGTB   = '#fafafa';

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

function ToggleRow({ on, onToggle, onLabel, offLabel, hint, children }) {
    return (
        <div style={{ border: `1px solid ${DLGBORDER}`, borderRadius: 8, padding: '12px 14px', background: on ? '#fff' : DLGBGTB }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                    type="button"
                    onClick={onToggle}
                    style={{
                        width: 32, height: 18, borderRadius: 999, border: 'none',
                        background: on ? DLGNAVY : '#cfd2d8',
                        position: 'relative', cursor: 'pointer', padding: 0, flexShrink: 0,
                        transition: 'background 150ms',
                    }}
                >
                    <span style={{
                        position: 'absolute', top: 2, left: on ? 16 : 2,
                        width: 14, height: 14, borderRadius: '50%', background: '#fff',
                        transition: 'left 150ms', display: 'block',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                    }} />
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 500 }}>{on ? onLabel : offLabel}</div>
                    {hint && <div style={{ fontSize: 12, color: DLGTEXT2, marginTop: 2 }}>{hint}</div>}
                </div>
            </div>
            {on && children && <div style={{ marginTop: 12 }}>{children}</div>}
        </div>
    );
}

function SharePctField({ label, value, onChange, error, helperText }) {
    return (
        <TextField
            label={label}
            value={value}
            onChange={e => onChange(e.target.value.replace(/[^0-9.]/g, ''))}
            size="small"
            type="number"
            inputProps={{ min: 0, max: 100, step: 0.01 }}
            InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
            helperText={helperText}
            error={!!error}
            fullWidth
        />
    );
}

function AddApartmentDialog({ open, onClose, userId, assocParam, apartments, onCreated }) {
    const [anr, setAnr] = useState('');
    const [fnr, setFnr] = useState('');
    const [size, setSize] = useState('');
    const [share, setShare] = useState('');
    const [share2, setShare2] = useState('');
    const [share2Custom, setShare2Custom] = useState(false);
    const [share3, setShare3] = useState('');
    const [share3Custom, setShare3Custom] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    React.useEffect(() => {
        if (!open) {
            setAnr(''); setFnr(''); setSize(''); setShare('');
            setShare2(''); setShare2Custom(false);
            setShare3(''); setShare3Custom(false);
            setSaving(false); setError('');
        }
    }, [open]);

    const eff2 = share2Custom ? share2 : share;
    const eff3 = share3Custom ? share3 : share;

    const existingShare  = apartments.reduce((s, a) => s + parseFloat(a.share   || 0), 0);
    const existingShare2 = apartments.reduce((s, a) => s + parseFloat(a.share_2 || 0), 0);
    const existingShare3 = apartments.reduce((s, a) => s + parseFloat(a.share_3 || 0), 0);
    const round2 = n => Math.round(n * 100) / 100;
    const shareOver  = parseFloat(share)  > 0 && round2(existingShare  + parseFloat(share))  > 100;
    const share2Over = parseFloat(eff2)   > 0 && round2(existingShare2 + parseFloat(eff2))   > 100;
    const share3Over = parseFloat(eff3)   > 0 && round2(existingShare3 + parseFloat(eff3))   > 100;

    const totalShare  = round2(existingShare  + parseFloat(share  || 0));
    const totalShare2 = round2(existingShare2 + parseFloat(eff2   || 0));
    const totalShare3 = round2(existingShare3 + parseFloat(eff3   || 0));
    const allOk = totalShare === 100 && totalShare2 === 100 && totalShare3 === 100;

    const isValid = anr.trim() && fnr.trim()
        && parseFloat(share) >= 0 && parseFloat(eff2) >= 0 && parseFloat(eff3) >= 0
        && !shareOver && !share2Over && !share3Over;

    const handleSubmit = async () => {
        setError('');
        setSaving(true);
        try {
            const resp = await apiFetch(`${API_URL}/Apartment${assocParam}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: userId, anr, fnr,
                    size: parseFloat(size) || 0,
                    share: parseFloat(share) || 0,
                    share_2: parseFloat(eff2) || 0,
                    share_3: parseFloat(eff3) || 0,
                }),
            });
            if (resp.ok) { onCreated(await resp.json()); }
            else { const data = await resp.json(); setError(data.detail || 'Villa við skráningu.'); }
        } catch {
            setError('Tenging við þjón mistókst.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth={false}
            PaperProps={{ sx: { width: 680, maxWidth: '95vw', borderRadius: '12px', overflow: 'hidden' } }}
        >
            {/* Header */}
            <Box sx={{ p: '20px 24px 16px', borderBottom: `1px solid ${DLGBORDER}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <Box>
                    <Typography sx={{ fontSize: 20, fontWeight: 600, lineHeight: 1.25 }}>Skrá nýja íbúð</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Íbúðin verður bætt við húsfélagið — hlutföll verður að setja upp handvirkt.
                    </Typography>
                </Box>
                <IconButton size="small" onClick={onClose} sx={{ mt: -0.5 }}>
                    <CloseIcon sx={{ fontSize: 20 }} />
                </IconButton>
            </Box>

            {/* Body */}
            <Box sx={{ p: '20px 24px', overflowY: 'auto' }}>
                <DlgSection hint="Eins og þau birtast í Þjóðskrá / FMR">Auðkenni</DlgSection>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                    <TextField label="Merking" value={anr} onChange={e => setAnr(e.target.value)} size="small" fullWidth />
                    <TextField label="Fastanúmer" value={fnr} onChange={e => setFnr(e.target.value)} size="small" fullWidth
                        inputProps={{ style: { fontFamily: 'monospace' } }} />
                </Box>

                <DlgSection hint="Grunnur sem hin hlutföllin nota sjálfgefið">Stærð og grunnhlutfall</DlgSection>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                    <TextField
                        label="Stærð" value={size}
                        onChange={e => setSize(e.target.value.replace(/[^0-9.]/g, ''))}
                        size="small" type="number" inputProps={{ min: 0, step: 0.01 }}
                        InputProps={{ endAdornment: <InputAdornment position="end">m²</InputAdornment> }}
                        fullWidth
                    />
                    <SharePctField
                        label="Matshlutfall" value={share} onChange={setShare}
                        helperText="Skv. eignaskiptasamningi" error={shareOver}
                    />
                </Box>
                {shareOver && <Alert severity="error" sx={{ mt: 1 }}>Heildarhlutfall (matshlutfall) myndi fara yfir 100%</Alert>}

                <DlgSection hint="Aðeins nauðsynlegt ef hiti eða lóð er reiknuð öðruvísi en grunnhlutfall">Sérstök hlutföll</DlgSection>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                    <ToggleRow on={share2Custom} onToggle={() => setShare2Custom(v => !v)}
                        onLabel="Hiti — sérstakt hlutfall"
                        offLabel={`Hiti — fylgir grunnhlutfalli (${share || 0}%)`}
                        hint={share2Custom ? 'Reiknað eftir mæli, ekki eignahlut.' : 'Smelltu til að setja annað gildi.'}
                    >
                        <SharePctField label="Matshlutfall hita" value={share2} onChange={setShare2} error={share2Over} />
                    </ToggleRow>
                    <ToggleRow on={share3Custom} onToggle={() => setShare3Custom(v => !v)}
                        onLabel="Lóð — sérstakt hlutfall"
                        offLabel={`Lóð — fylgir grunnhlutfalli (${share || 0}%)`}
                        hint="Smelltu til að setja annað gildi."
                    >
                        <SharePctField label="Matshlutfall lóðar" value={share3} onChange={setShare3} error={share3Over} />
                    </ToggleRow>
                </Box>
                {(share2Over || share3Over) && (
                    <Alert severity="error" sx={{ mt: 1 }}>
                        {share2Over && 'Heildarhlutfall hita fer yfir 100%. '}
                        {share3Over && 'Heildarhlutfall lóðar fer yfir 100%.'}
                    </Alert>
                )}

                {/* Live ratio readout */}
                {(share || eff2 || eff3) && (
                    <Box sx={{ mt: 2.25, p: '10px 14px', borderRadius: 1, background: DLGNAVYTINT, display: 'flex', alignItems: 'center', gap: 1.5, fontSize: '12.5px' }}>
                        <Box sx={{ flex: 1 }}>
                            Eftir vistun:{' '}
                            <strong style={{ fontFamily: 'monospace' }}>Hlutfall {totalShare.toFixed(2)}%</strong>
                            {' · '}
                            <strong style={{ fontFamily: 'monospace' }}>Hiti {totalShare2.toFixed(2)}%</strong>
                            {' · '}
                            <strong style={{ fontFamily: 'monospace' }}>Lóð {totalShare3.toFixed(2)}%</strong>
                        </Box>
                        {allOk
                            ? <span style={{ color: DLGPOS, fontWeight: 600, whiteSpace: 'nowrap' }}>✓ Allir lyklar = 100%</span>
                            : <span style={{ color: DLGWARN, fontWeight: 500, fontSize: 12, whiteSpace: 'nowrap' }}>Ekki allir lyklar = 100%</span>
                        }
                    </Box>
                )}
                {error && <Alert severity="error" sx={{ mt: 1.5 }}>{error}</Alert>}
            </Box>

            {/* Footer */}
            <Box sx={{ p: '14px 20px', borderTop: `1px solid ${DLGBORDER}`, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                <Button sx={ghostButtonSx} onClick={onClose}>Hætta við</Button>
                <Button variant="contained" sx={primaryButtonSx} disabled={!isValid || saving} onClick={handleSubmit}>
                    {saving ? <CircularProgress size={18} color="inherit" /> : 'Skrá íbúð'}
                </Button>
            </Box>
        </Dialog>
    );
}

function ApartmentRow({ apt, apartments, onOwnersChanged, onSaved, isDisabled }) {
    const [ownerDialogOpen, setOwnerDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const { user } = React.useContext(UserContext);

    return (
        <>
            <TableRow hover sx={isDisabled ? { opacity: 0.55 } : {}}>
                <TableCell>{apt.anr}</TableCell>
                <TableCell>{apt.fnr}</TableCell>
                <TableCell>{apt.size} m²</TableCell>
                <TableCell>{apt.share}%</TableCell>
                <TableCell>{apt.share_2}%</TableCell>
                <TableCell>{apt.share_3}%</TableCell>
                {!isDisabled && (
                    <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
                            {apt.owners.map(o => (
                                <Chip key={o.id} label={o.name} size="small" />
                            ))}
                            <Chip
                                label="+ Eigandi"
                                size="small"
                                variant="outlined"
                                color="secondary"
                                onClick={() => setOwnerDialogOpen(true)}
                                sx={{ cursor: 'pointer' }}
                            />
                        </Box>
                    </TableCell>
                )}
                <TableCell align="right" sx={{ width: 48 }}>
                    <Tooltip title={isDisabled ? 'Virkja / breyta' : 'Breyta'}>
                        <IconButton size="small" onClick={() => setEditDialogOpen(true)}>
                            <EditIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </TableCell>
            </TableRow>

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

function EditApartmentDialog({ open, onClose, apt, apartments, isDisabled, onSaved, onDeleted }) {
    const [anr, setAnr] = useState(apt.anr);
    const [fnr, setFnr] = useState(apt.fnr);
    const [size, setSize] = useState(String(apt.size || ''));
    const [share, setShare] = useState(String(apt.share));
    const [share2, setShare2] = useState(String(apt.share_2));
    const [share2Custom, setShare2Custom] = useState(false);
    const [share3, setShare3] = useState(String(apt.share_3));
    const [share3Custom, setShare3Custom] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [error, setError] = useState('');

    React.useEffect(() => {
        if (open) {
            setAnr(apt.anr); setFnr(apt.fnr);
            setSize(String(apt.size || ''));
            setShare(String(apt.share));
            setShare2(String(apt.share_2));
            setShare3(String(apt.share_3));
            setShare2Custom(Math.abs(parseFloat(apt.share_2 || 0) - parseFloat(apt.share || 0)) > 0.005);
            setShare3Custom(Math.abs(parseFloat(apt.share_3 || 0) - parseFloat(apt.share || 0)) > 0.005);
            setError('');
        }
    }, [open, apt]);

    const eff2 = share2Custom ? share2 : share;
    const eff3 = share3Custom ? share3 : share;

    const others = apartments.filter(a => a.id !== apt.id);
    const otherShare  = others.reduce((s, a) => s + parseFloat(a.share   || 0), 0);
    const otherShare2 = others.reduce((s, a) => s + parseFloat(a.share_2 || 0), 0);
    const otherShare3 = others.reduce((s, a) => s + parseFloat(a.share_3 || 0), 0);
    const round2 = n => Math.round(n * 100) / 100;
    const shareOver  = round2(otherShare  + parseFloat(share  || 0)) > 100;
    const share2Over = round2(otherShare2 + parseFloat(eff2   || 0)) > 100;
    const share3Over = round2(otherShare3 + parseFloat(eff3   || 0)) > 100;

    const totalShare  = round2(otherShare  + parseFloat(share  || 0));
    const totalShare2 = round2(otherShare2 + parseFloat(eff2   || 0));
    const totalShare3 = round2(otherShare3 + parseFloat(eff3   || 0));
    const allOk = totalShare === 100 && totalShare2 === 100 && totalShare3 === 100;

    const isValid = anr.trim() && fnr.trim()
        && parseFloat(share) >= 0 && parseFloat(eff2) >= 0 && parseFloat(eff3) >= 0
        && !shareOver && !share2Over && !share3Over;

    const payload = { anr, fnr, size: parseFloat(size) || 0, share: parseFloat(share) || 0, share_2: parseFloat(eff2) || 0, share_3: parseFloat(eff3) || 0 };

    const handleSave = async () => {
        setError(''); setSaving(true);
        try {
            const resp = await apiFetch(`${API_URL}/Apartment/update/${apt.id}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (resp.ok) { onSaved(); }
            else { const data = await resp.json(); setError(data.detail || 'Villa við uppfærslu.'); }
        } catch { setError('Tenging við þjón mistókst.'); } finally { setSaving(false); }
    };

    const handleDisable = async () => {
        setDeleting(true);
        try {
            const resp = await apiFetch(`${API_URL}/Apartment/delete/${apt.id}`, { method: 'DELETE' });
            if (resp.ok) { setConfirmDelete(false); onDeleted(); }
            else { const data = await resp.json(); setError(data.detail || 'Villa við óvirkjun.'); setConfirmDelete(false); }
        } catch { setError('Tenging við þjón mistókst.'); setConfirmDelete(false); } finally { setDeleting(false); }
    };

    const handleEnable = async () => {
        setError(''); setSaving(true);
        try {
            const resp = await apiFetch(`${API_URL}/Apartment/enable/${apt.id}`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (resp.ok) { onSaved(); }
            else { const data = await resp.json(); setError(data.detail || 'Villa við virkjun.'); }
        } catch { setError('Tenging við þjón mistókst.'); } finally { setSaving(false); }
    };

    return (
        <>
        <Dialog open={open} onClose={onClose} maxWidth={false}
            PaperProps={{ sx: { width: 680, maxWidth: '95vw', borderRadius: '12px', overflow: 'hidden' } }}
        >
            {/* Header */}
            <Box sx={{ p: '20px 24px 16px', borderBottom: `1px solid ${DLGBORDER}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <Box>
                    <Box sx={{ display: 'flex', gap: 1, mb: 0.75, alignItems: 'center' }}>
                        <CtxChip>Íbúð</CtxChip>
                    </Box>
                    <Typography sx={{ fontSize: 20, fontWeight: 600, lineHeight: 1.25 }}>
                        {isDisabled ? `Óvirk íbúð — ${apt.anr}` : `Breyta íbúð ${apt.anr}`}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Skipulagslegir reitir — breytast sjaldan og hafa áhrif á reikningagerð fyrir alla eigendur.
                    </Typography>
                </Box>
                <IconButton size="small" onClick={onClose} sx={{ mt: -0.5 }}>
                    <CloseIcon sx={{ fontSize: 20 }} />
                </IconButton>
            </Box>

            {/* Body */}
            <Box sx={{ p: '20px 24px', overflowY: 'auto' }}>
                <DlgSection hint="Eins og þau birtast í Þjóðskrá / FMR">Auðkenni</DlgSection>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                    <TextField label="Merking" value={anr} onChange={e => setAnr(e.target.value)} size="small" fullWidth />
                    <TextField label="Fastanúmer" value={fnr} onChange={e => setFnr(e.target.value)} size="small" fullWidth
                        inputProps={{ style: { fontFamily: 'monospace' } }}
                        helperText="Sótt sjálfkrafa úr Fasteignaskrá" />
                </Box>

                <DlgSection hint="Grunnur sem hin hlutföllin nota sjálfgefið">Stærð og grunnhlutfall</DlgSection>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                    <TextField
                        label="Stærð" value={size}
                        onChange={e => setSize(e.target.value.replace(/[^0-9.]/g, ''))}
                        size="small" type="number" inputProps={{ min: 0, step: 0.01 }}
                        InputProps={{ endAdornment: <InputAdornment position="end">m²</InputAdornment> }}
                        fullWidth
                    />
                    <SharePctField
                        label="Matshlutfall" value={share} onChange={setShare}
                        helperText="Skv. eignaskiptasamningi" error={shareOver}
                    />
                </Box>
                {shareOver && <Alert severity="error" sx={{ mt: 1 }}>Heildarhlutfall (matshlutfall) myndi fara yfir 100%</Alert>}

                <DlgSection hint="Aðeins nauðsynlegt ef hiti eða lóð er reiknuð öðruvísi en grunnhlutfall">Sérstök hlutföll</DlgSection>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                    <ToggleRow on={share2Custom} onToggle={() => setShare2Custom(v => !v)}
                        onLabel="Hiti — sérstakt hlutfall"
                        offLabel={`Hiti — fylgir grunnhlutfalli (${share || 0}%)`}
                        hint={share2Custom ? 'Reiknað eftir mæli, ekki eignahlut.' : 'Smelltu til að setja annað gildi.'}
                    >
                        <SharePctField label="Matshlutfall hita" value={share2} onChange={setShare2} error={share2Over} />
                    </ToggleRow>
                    <ToggleRow on={share3Custom} onToggle={() => setShare3Custom(v => !v)}
                        onLabel="Lóð — sérstakt hlutfall"
                        offLabel={`Lóð — fylgir grunnhlutfalli (${share || 0}%)`}
                        hint="Smelltu til að setja annað gildi."
                    >
                        <SharePctField label="Matshlutfall lóðar" value={share3} onChange={setShare3} error={share3Over} />
                    </ToggleRow>
                </Box>
                {(share2Over || share3Over) && (
                    <Alert severity="error" sx={{ mt: 1 }}>
                        {share2Over && 'Heildarhlutfall hita fer yfir 100%. '}
                        {share3Over && 'Heildarhlutfall lóðar fer yfir 100%.'}
                    </Alert>
                )}

                {/* Live ratio readout */}
                <Box sx={{ mt: 2.25, p: '10px 14px', borderRadius: 1, background: DLGNAVYTINT, display: 'flex', alignItems: 'center', gap: 1.5, fontSize: '12.5px' }}>
                    <Box sx={{ flex: 1 }}>
                        Eftir vistun:{' '}
                        <strong style={{ fontFamily: 'monospace' }}>Hlutfall {totalShare.toFixed(2)}%</strong>
                        {' · '}
                        <strong style={{ fontFamily: 'monospace' }}>Hiti {totalShare2.toFixed(2)}%</strong>
                        {' · '}
                        <strong style={{ fontFamily: 'monospace' }}>Lóð {totalShare3.toFixed(2)}%</strong>
                    </Box>
                    {allOk
                        ? <span style={{ color: DLGPOS, fontWeight: 600, whiteSpace: 'nowrap' }}>✓ Allir lyklar = 100%</span>
                        : <span style={{ color: DLGWARN, fontWeight: 500, fontSize: 12, whiteSpace: 'nowrap' }}>Ekki allir lyklar = 100%</span>
                    }
                </Box>

                {error && <Alert severity="error" sx={{ mt: 1.5 }}>{error}</Alert>}
            </Box>

            {/* Danger zone — only for active apartments */}
            {!isDisabled && (
                <Box sx={{ borderTop: `1px solid ${DLGBORDER}`, p: '12px 24px', background: DLGBGTB, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
                    <Box>
                        <Typography sx={{ fontSize: 13, fontWeight: 500 }}>Óvirkja íbúð</Typography>
                        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                            Hættir að birtast í reikningum og yfirliti — gögnum er haldið.
                        </Typography>
                    </Box>
                    <button
                        onClick={() => setConfirmDelete(true)}
                        style={{ background: 'transparent', border: `1px solid ${DLGBORDER}`, color: '#c62828', padding: '6px 12px', borderRadius: 4, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
                    >
                        Óvirkja
                    </button>
                </Box>
            )}

            {/* Footer */}
            <Box sx={{ p: '14px 20px', borderTop: `1px solid ${DLGBORDER}`, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                <Button sx={ghostButtonSx} onClick={onClose}>Hætta við</Button>
                <Button variant="contained" sx={primaryButtonSx} disabled={!isValid || saving} onClick={isDisabled ? handleEnable : handleSave}>
                    {saving ? <CircularProgress size={18} color="inherit" /> : isDisabled ? 'Virkja íbúð' : 'Vista breytingar'}
                </Button>
            </Box>
        </Dialog>

        <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)} maxWidth="xs" fullWidth>
            <DialogTitle>Óvirkja íbúð</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    Ertu viss um að þú viljir óvirkja íbúð <strong>{apt.anr}</strong>?
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button sx={ghostButtonSx} onClick={() => setConfirmDelete(false)}>Hætta við</Button>
                <Button variant="contained" sx={destructiveButtonSx} disabled={deleting} onClick={handleDisable}>
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
    const round2 = n => Math.round(n * 100) / 100;
    const shareOver = parseFloat(share) > 0 && round2(existingSum + parseFloat(share)) > 100;
    const isValid = kennitala.length === 10 && parseFloat(share) > 0 && !shareOver;
    const newSharePct = parseFloat(share) || 0;
    const remaining = round2(100 - existingSum);
    const currentPayer = apt.owners.find(o => o.is_payer);

    const handleAdd = async () => {
        setError('');
        setSaving(true);
        try {
            const resp = await apiFetch(`${API_URL}/Owner${assocParam}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: userId, kennitala,
                    apartment_id: apt.id,
                    share: parseFloat(share), is_payer: isPayer,
                }),
            });
            if (resp.ok) { onChanged(); }
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
                    <Box sx={{ display: 'flex', gap: 1, mb: 0.75, alignItems: 'center', flexWrap: 'wrap' }}>
                        <CtxChip color="green">Nýr eigandi</CtxChip>
                        <CtxChip>Íbúð {apt.anr}</CtxChip>
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

                <DlgSection hint="Forvalið út frá síðu sem þú varst á">② Tenging við íbúð</DlgSection>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 1.5 }}>
                    <TextField
                        label="Íbúð"
                        value={`${apt.anr}${apt.size ? ` — ${apt.size} m²` : ''}`}
                        size="small" fullWidth disabled
                    />
                    <TextField
                        label="Hlutfall"
                        value={share}
                        onChange={e => setShare(e.target.value.replace(/[^0-9.]/g, ''))}
                        size="small" type="number"
                        inputProps={{ min: 0, max: 100, step: 0.01 }}
                        InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                        helperText={`Eftir: ${round2(remaining - newSharePct).toFixed(2)}%`}
                        error={shareOver} fullWidth
                    />
                </Box>

                {(existingSum > 0 || newSharePct > 0) && (
                    <Box sx={{ mt: 1.5, p: '10px 14px', border: `1px solid ${DLGBORDER}`, borderRadius: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75, fontSize: '11.5px', color: DLGTEXT2, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                            <span>Skipting í íbúð {apt.anr} eftir vistun</span>
                            <span style={{ color: round2(existingSum + newSharePct) === 100 ? DLGPOS : DLGWARN }}>
                                {round2(existingSum + newSharePct).toFixed(2)}%
                            </span>
                        </Box>
                        <Box sx={{ height: 10, borderRadius: 999, overflow: 'hidden', background: '#f3f4f6', display: 'flex' }}>
                            {apt.owners.map((o, i) => (
                                <div key={o.id} style={{ width: `${parseFloat(o.share)}%`, background: i % 2 === 0 ? DLGNAVY : '#3d5a9f' }} />
                            ))}
                            {newSharePct > 0 && <div style={{ width: `${newSharePct}%`, background: DLGGREEN }} />}
                        </Box>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '3px 10px', mt: 0.75, fontSize: '11.5px' }}>
                            {apt.owners.map((o, i) => (
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
                <Box sx={{ display: 'flex', gap: 1 }}>
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
                            onClick={() => setIsPayer(opt.val)}
                            sx={{
                                flex: 1, p: '12px 14px', cursor: 'pointer', borderRadius: 2,
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
                <Button variant="contained" sx={primaryButtonSx} disabled={!isValid || saving} onClick={handleAdd}>
                    {saving ? <CircularProgress size={18} color="inherit" /> : 'Skrá eiganda'}
                </Button>
            </Box>
        </Dialog>
    );
}

export default ApartmentsPage;
