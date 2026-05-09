import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../api';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8010';

/**
 * Resolves a kennitala to a name.
 * - Checks our own DB first, then falls back to Já/Þjóðskrá.
 * - Fires automatically when kennitala reaches 10 digits.
 * Returns: { name, status: 'idle'|'loading'|'found'|'not_found'|'error' }
 */
export default function useKennitalaLookup(kennitala) {
    const [name, setName] = useState('');
    const [lookupStatus, setLookupStatus] = useState('idle');
    const lastQueried = useRef('');

    useEffect(() => {
        const kt = (kennitala || '').replace(/\D/g, '');
        if (kt.length !== 10) {
            setName('');
            setLookupStatus('idle');
            lastQueried.current = '';
            return;
        }
        if (kt === lastQueried.current) return;
        lastQueried.current = kt;

        let cancelled = false;
        setLookupStatus('loading');
        setName('');

        apiFetch(`${API_URL}/User/lookup?kennitala=${kt}`)
            .then(r => r.ok ? r.json() : r.json().then(d => Promise.reject(d)))
            .then(data => {
                if (cancelled) return;
                setName(data.name);
                setLookupStatus('found');
            })
            .catch(err => {
                if (cancelled) return;
                const is404 = err?.detail?.includes('fannst ekki') || err?.detail?.includes('404');
                setLookupStatus(is404 ? 'not_found' : 'error');
                setName('');
            });

        return () => { cancelled = true; };
    }, [kennitala]);

    return { name, lookupStatus };
}
