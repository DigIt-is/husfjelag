import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Typography, CircularProgress, Button, IconButton, Tooltip,
    Dialog, DialogTitle, DialogContent, DialogActions, Alert,
    TextField, MenuItem, Select, FormControl, InputLabel,
    Table, TableHead, TableBody, TableRow, TableCell, Paper,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { UserContext } from './UserContext';
import { apiFetch } from '../api';
import SideBar from './Sidebar';
import { primaryButtonSx, ghostButtonSx, destructiveButtonSx } from '../ui/buttons';
import { LabelChip } from '../ui/chips';
import { HEAD_SX, HEAD_CELL_SX } from './tableUtils';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8010';

const BORDER = '#e8e8e8';

const EVENT_TYPES = [
    { value: 'MEETING', label: 'Fundur' },
    { value: 'STATEMENT', label: 'Ársreikningur' },
    { value: 'BUDGET', label: 'Áætlun' },
    { value: 'COLLECTION', label: 'Innheimta' },
    { value: 'OTHER', label: 'Annað' },
];
const TYPE_LABELS = Object.fromEntries(EVENT_TYPES.map(t => [t.value, t.label]));

const VISIBILITIES = [
    { value: 'ALL', label: 'Allir' },
    { value: 'BOARD', label: 'Aðeins stjórn' },
];
const VISIBILITY_LABELS = Object.fromEntries(VISIBILITIES.map(v => [v.value, v.label]));

const BOARD_ROLES = ['Formaður', 'Gjaldkeri', 'Kerfisstjóri'];

function fmtDate(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}.${m}.${y}`;
}

function todayIso() {
    const t = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
}

function EventsPage() {
    const navigate = useNavigate();
    const { user, assocParam, currentAssociation } = React.useContext(UserContext);
    const [events, setEvents] = useState(undefined);
    const [error, setError] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState(null);

    const isBoard = BOARD_ROLES.includes(currentAssociation?.role);

    useEffect(() => {
        if (!user) { navigate('/login'); return; }
        load();
    }, [user, assocParam]); // eslint-disable-line react-hooks/exhaustive-deps

    const load = async () => {
        try {
            const resp = await apiFetch(`${API_URL}/Event/${user.id}${assocParam}`);
            if (resp.ok) setEvents(await resp.json());
            else { setError('Villa við að sækja viðburði.'); setEvents([]); }
        } catch {
            setError('Tenging við þjón mistókst.');
            setEvents([]);
        }
    };

    if (events === undefined) {
        return (
            <div className="dashboard">
                <SideBar />
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8, flex: 1 }}>
                    <CircularProgress color="secondary" />
                </Box>
            </div>
        );
    }

    const today = todayIso();
    const openCreate = () => { setEditing(null); setDialogOpen(true); };
    const openEdit = (evt) => { setEditing(evt); setDialogOpen(true); };

    return (
        <div className="dashboard">
            <SideBar />
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
                {/* Zone 1: Header */}
                <Box sx={{
                    px: 3, py: 2, background: '#fff', borderBottom: `1px solid ${BORDER}`,
                    flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                    <Box>
                        <Typography variant="h5">Viðburðir</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                            Fundir, áminningar og verkefni húsfélagsins
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        {isBoard && (
                            <Button
                                variant="contained" sx={primaryButtonSx}
                                startIcon={<AddIcon sx={{ fontSize: 18 }} />}
                                onClick={openCreate}
                            >
                                Nýr viðburður
                            </Button>
                        )}
                    </Box>
                </Box>

                {/* Zone 3: Content */}
                <Box sx={{ flex: 1, overflowY: 'auto', p: 4 }}>
                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                    {events.length === 0 ? (
                        <Typography color="text.secondary" sx={{ mt: 2 }}>
                            Engir viðburðir skráðir.{isBoard ? ' Smelltu á „Nýr viðburður“ til að bæta við.' : ''}
                        </Typography>
                    ) : (
                        <Paper variant="outlined">
                            <Table size="small">
                                <TableHead sx={HEAD_SX}>
                                    <TableRow>
                                        <TableCell sx={{ ...HEAD_CELL_SX, px: 3 }}>Dagsetning</TableCell>
                                        <TableCell sx={HEAD_CELL_SX}>Tími</TableCell>
                                        <TableCell sx={HEAD_CELL_SX}>Tegund</TableCell>
                                        <TableCell sx={HEAD_CELL_SX}>Titill</TableCell>
                                        <TableCell sx={HEAD_CELL_SX}>Sýnileiki</TableCell>
                                        <TableCell sx={HEAD_CELL_SX}>Áminning</TableCell>
                                        {isBoard && <TableCell sx={HEAD_CELL_SX} align="right" />}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {events.map(evt => {
                                        const isPast = evt.event_date < today;
                                        return (
                                            <TableRow key={evt.id} hover sx={{ opacity: isPast ? 0.55 : 1, '& td': { borderBottom: `1px solid #f2f2f2` } }}>
                                                <TableCell sx={{ px: 3, whiteSpace: 'nowrap' }}>{fmtDate(evt.event_date)}</TableCell>
                                                <TableCell sx={{ px: 2, whiteSpace: 'nowrap' }}>{evt.event_time ? evt.event_time.slice(0, 5) : '—'}</TableCell>
                                                <TableCell sx={{ px: 2 }}><LabelChip label={TYPE_LABELS[evt.event_type] || evt.event_type} /></TableCell>
                                                <TableCell sx={{ px: 2 }}>
                                                    <Typography sx={{ fontSize: 13.5 }}>{evt.title}</Typography>
                                                    {evt.description && (
                                                        <Typography sx={{ fontSize: 12, color: '#888' }}>{evt.description}</Typography>
                                                    )}
                                                </TableCell>
                                                <TableCell sx={{ px: 2, whiteSpace: 'nowrap' }}>{VISIBILITY_LABELS[evt.visibility] || evt.visibility}</TableCell>
                                                <TableCell sx={{ px: 2, whiteSpace: 'nowrap' }}>
                                                    {evt.reminder_days != null ? `${evt.reminder_days} d. áður` : '—'}
                                                </TableCell>
                                                {isBoard && (
                                                    <TableCell align="right" sx={{ width: 96, px: 3, whiteSpace: 'nowrap' }}>
                                                        <Tooltip title="Breyta">
                                                            <IconButton size="small" onClick={() => openEdit(evt)}>
                                                                <EditIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <DeleteEventButton event={evt} assocParam={assocParam} userId={user.id} onDeleted={load} />
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </Paper>
                    )}
                </Box>
            </Box>

            {isBoard && (
                <EventDialog
                    open={dialogOpen}
                    event={editing}
                    userId={user.id}
                    assocParam={assocParam}
                    onClose={() => setDialogOpen(false)}
                    onSaved={() => { setDialogOpen(false); load(); }}
                    onDeleted={() => { setDialogOpen(false); load(); }}
                />
            )}
        </div>
    );
}

function DeleteEventButton({ event, assocParam, userId, onDeleted }) {
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async () => {
        setDeleting(true);
        try {
            const resp = await apiFetch(`${API_URL}/Event/delete/${event.id}${assocParam}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId }),
            });
            if (resp.ok) { setConfirmOpen(false); onDeleted(); }
        } finally {
            setDeleting(false);
        }
    };

    return (
        <>
            <Tooltip title="Eyða">
                <IconButton size="small" sx={{ color: '#c62828' }} onClick={() => setConfirmOpen(true)}>
                    <DeleteOutlineIcon fontSize="small" />
                </IconButton>
            </Tooltip>
            <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Eyða viðburði</DialogTitle>
                <DialogContent>
                    <Typography>
                        Ertu viss um að þú viljir eyða viðburðinum <strong>{event.title}</strong>?
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button sx={ghostButtonSx} onClick={() => setConfirmOpen(false)}>Hætta við</Button>
                    <Button sx={destructiveButtonSx} disabled={deleting} onClick={handleDelete}>
                        {deleting ? <CircularProgress size={18} color="inherit" /> : 'Já, eyða'}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}

function EventDialog({ open, event, userId, assocParam, onClose, onSaved }) {
    const isEdit = !!event;
    const [title, setTitle] = useState('');
    const [eventType, setEventType] = useState('MEETING');
    const [eventDate, setEventDate] = useState('');
    const [eventTime, setEventTime] = useState('');
    const [visibility, setVisibility] = useState('ALL');
    const [reminderDays, setReminderDays] = useState('');
    const [description, setDescription] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open) return;
        setError('');
        if (event) {
            setTitle(event.title || '');
            setEventType(event.event_type || 'OTHER');
            setEventDate(event.event_date || '');
            setEventTime(event.event_time ? event.event_time.slice(0, 5) : '');
            setVisibility(event.visibility || 'ALL');
            setReminderDays(event.reminder_days != null ? String(event.reminder_days) : '');
            setDescription(event.description || '');
        } else {
            setTitle(''); setEventType('MEETING'); setEventDate(''); setEventTime('');
            setVisibility('ALL'); setReminderDays(''); setDescription('');
        }
    }, [open, event]);

    const isValid = title.trim().length > 0 && !!eventDate;

    const handleSave = async () => {
        setError('');
        setSaving(true);
        const body = {
            user_id: userId,
            title: title.trim(),
            event_type: eventType,
            event_date: eventDate,
            event_time: eventTime || null,
            visibility,
            reminder_days: reminderDays === '' ? null : parseInt(reminderDays, 10),
            description: description.trim(),
        };
        const url = isEdit
            ? `${API_URL}/Event/update/${event.id}${assocParam}`
            : `${API_URL}/Event${assocParam}`;
        try {
            const resp = await apiFetch(url, {
                method: isEdit ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (resp.ok) { onSaved(); }
            else { const data = await resp.json(); setError(data.detail || 'Villa við vistun.'); }
        } catch {
            setError('Tenging við þjón mistókst.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ pb: 0.5 }}>
                {isEdit ? 'Breyta viðburði' : 'Nýr viðburður'}
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 400, mt: 0.5 }}>
                    Birtist á yfirliti. Áminning er send með tölvupósti á valinn hóp.
                </Typography>
            </DialogTitle>

            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
                <TextField
                    label="Titill" value={title} onChange={e => setTitle(e.target.value)}
                    size="small" fullWidth autoFocus
                />
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <FormControl size="small" sx={{ flex: 1 }}>
                        <InputLabel>Tegund</InputLabel>
                        <Select value={eventType} label="Tegund" onChange={e => setEventType(e.target.value)}>
                            {EVENT_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ flex: 1 }}>
                        <InputLabel>Sýnileiki</InputLabel>
                        <Select value={visibility} label="Sýnileiki" onChange={e => setVisibility(e.target.value)}>
                            {VISIBILITIES.map(v => <MenuItem key={v.value} value={v.value}>{v.label}</MenuItem>)}
                        </Select>
                    </FormControl>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                        label="Dagsetning" type="date" value={eventDate}
                        onChange={e => setEventDate(e.target.value)}
                        size="small" sx={{ flex: 1 }} InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                        label="Tími (valfrjálst)" type="time" value={eventTime}
                        onChange={e => setEventTime(e.target.value)}
                        size="small" sx={{ flex: 1 }} InputLabelProps={{ shrink: true }}
                    />
                </Box>
                <TextField
                    label="Áminning — dögum áður (valfrjálst)" type="number" value={reminderDays}
                    onChange={e => setReminderDays(e.target.value.replace(/[^0-9]/g, ''))}
                    size="small" fullWidth inputProps={{ min: 0 }}
                    helperText="Tölvupóstur er sendur sjálfkrafa á valinn hóp þennan dagafjölda fyrir viðburð."
                />
                <TextField
                    label="Lýsing (valfrjálst)" value={description}
                    onChange={e => setDescription(e.target.value)}
                    size="small" fullWidth multiline minRows={2}
                />
                {error && <Alert severity="error">{error}</Alert>}
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2.5, justifyContent: 'flex-end' }}>
                <Button sx={ghostButtonSx} onClick={onClose}>Hætta við</Button>
                <Button variant="contained" sx={primaryButtonSx} disabled={!isValid || saving} onClick={handleSave}>
                    {saving ? <CircularProgress size={18} color="inherit" /> : 'Vista'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default EventsPage;
