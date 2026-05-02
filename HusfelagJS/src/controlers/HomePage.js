import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Box, Typography, Button, Collapse } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import CreditCardOutlinedIcon from '@mui/icons-material/CreditCardOutlined';
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import LabelOutlinedIcon from '@mui/icons-material/LabelOutlined';

function CtaBar({ mini, onSignup }) {
    return (
        <Box sx={{
            position: 'sticky', top: 0, zIndex: 100,
            background: '#1D366F',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            px: 4, py: mini ? 1 : 1.75,
            transition: 'padding 0.2s ease',
            boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
        }}>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5 }}>
                <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 15, letterSpacing: '0.06em' }}>
                    HÚSFJELAGIÐ
                </Typography>
                {!mini && (
                    <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: 13 }}>
                        — Hugbúnaður fyrir húsfélög
                    </Typography>
                )}
            </Box>
            <Button onClick={onSignup} sx={{
                background: '#08C076', color: '#fff', borderRadius: '20px',
                px: mini ? 2 : 2.5, py: mini ? 0.75 : 1,
                fontSize: mini ? 12 : 13, fontWeight: 600,
                textTransform: 'none', whiteSpace: 'nowrap',
                '&:hover': { background: '#06a866' }, transition: 'all 0.2s ease',
            }}>
                Innskráning →
            </Button>
        </Box>
    );
}

function AppMockup() {
    const kpi = (val, lbl, muted) => (
        <Box sx={{
            flex: 1, background: 'rgba(255,255,255,0.06)', borderRadius: 1.5,
            p: 1.25, textAlign: 'center', border: '1px solid rgba(255,255,255,0.08)',
        }}>
            <Typography sx={{ color: muted ? 'rgba(255,255,255,0.45)' : '#08C076', fontSize: 13, fontWeight: 600 }}>
                {val}
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, mt: 0.4 }}>{lbl}</Typography>
        </Box>
    );
    const bar = (lbl, pct, faded) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
            <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, width: 28 }}>{lbl}</Typography>
            <Box sx={{
                height: 6, borderRadius: 1,
                width: `${pct}%`,
                background: faded ? 'rgba(8,192,118,0.35)' : '#08C076',
                opacity: faded ? 1 : 0.8,
            }} />
        </Box>
    );
    return (
        <Box sx={{
            background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.14)',
            borderRadius: 2, overflow: 'hidden',
        }}>
            {/* topbar */}
            <Box sx={{
                background: 'rgba(255,255,255,0.08)', px: 1.75, py: 1,
                display: 'flex', gap: 1, alignItems: 'center',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
            }}>
                {[0,1,2].map(i => <Box key={i} sx={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />)}
                <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 9, ml: 1 }}>Yfirlit · Húsfélag</Typography>
            </Box>
            {/* body */}
            <Box sx={{ p: 1.75 }}>
                <Box sx={{ display: 'flex', gap: 1, mb: 1.25 }}>
                    {kpi('2.400.000 kr', 'Áætlun 2025', false)}
                    {kpi('200.000 kr', 'Mánaðarleg innheimta', false)}
                    {kpi('0 kr', 'Ógreitt', true)}
                </Box>
                <Box sx={{ background: 'rgba(255,255,255,0.05)', borderRadius: 1.5, p: 1.25 }}>
                    <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, letterSpacing: '0.06em', mb: 1 }}>
                        MÁNAÐARLEG INNHEIMTA
                    </Typography>
                    {bar('Jan', 80, false)}
                    {bar('Feb', 75, false)}
                    {bar('Mar', 90, false)}
                    {bar('Apr', 60, true)}
                </Box>
            </Box>
        </Box>
    );
}

function Hero({ onSignup }) {
    return (
        <Box sx={{ background: 'linear-gradient(135deg, #1D366F 0%, #0d2154 100%)', position: 'relative', overflow: 'hidden' }}>
            {/* decorative blobs */}
            <Box sx={{ position: 'absolute', width: 380, height: 380, borderRadius: '50%', background: 'rgba(8,192,118,0.10)', top: -100, right: -80 }} />
            <Box sx={{ position: 'absolute', width: 180, height: 180, borderRadius: '50%', background: 'rgba(8,192,118,0.07)', bottom: 20, left: -50 }} />
            <Box sx={{
                maxWidth: 1100, mx: 'auto', px: { xs: 3, md: 6 }, py: { xs: 5, md: 8 },
                display: 'flex', alignItems: 'center', gap: { xs: 4, md: 7 },
                flexDirection: { xs: 'column', md: 'row' },
                position: 'relative',
            }}>
                {/* text */}
                <Box sx={{ flex: 1 }}>
                    <Typography sx={{ color: '#08C076', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', mb: 1.75 }}>
                        Hugbúnaður fyrir íslensk húsfélög
                    </Typography>
                    <Typography variant="h3" sx={{ color: '#fff', fontWeight: 200, lineHeight: 1.25, mb: 2, fontSize: { xs: 28, md: 36 } }}>
                        Stjórnaðu húsfélaginu þínu með{' '}
                        <Box component="span" sx={{ fontWeight: 600 }}>einfaldri yfirsýn</Box>
                    </Typography>
                    <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, lineHeight: 1.65 }}>
                        Innheimta, áætlun og fjárhagsleg yfirlit — allt á einum stað.
                    </Typography>
                    <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, lineHeight: 1.65, mb: 3.5 }}>
                        Einfalt. Öruggt. Íslenskt.
                    </Typography>                    
                    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                        <Button onClick={onSignup} sx={{
                            background: '#08C076', color: '#fff', borderRadius: '24px',
                            px: 3.25, py: 1.375, fontSize: 14, fontWeight: 600, textTransform: 'none',
                            '&:hover': { background: '#06a866' },
                        }}>
                            Skráðu þig frítt →
                        </Button>
                        <Button component="a" href="#stories" sx={{
                            background: 'transparent', color: 'rgba(255,255,255,0.75)',
                            border: '1px solid rgba(255,255,255,0.3)', borderRadius: '24px',
                            px: 2.75, py: 1.25, fontSize: 14, fontWeight: 400, textTransform: 'none',
                            '&:hover': { background: 'rgba(255,255,255,0.06)' },
                        }}>
                            Segðu mér meira
                        </Button>
                    </Box>
                </Box>
                {/* app mockup */}
                <Box sx={{ flex: 1, width: '100%' }}>
                    <AppMockup />
                </Box>
            </Box>
        </Box>
    );
}

function StoryRow({ label, title, body, reverse, img, imgAlt }) {
    return (
        <Box sx={{
            maxWidth: 1060, mx: 'auto', px: { xs: 3, md: 5 }, py: { xs: 5, md: 8 },
            display: 'flex', alignItems: 'center', gap: { xs: 3.5, md: '60px' },
            flexDirection: { xs: 'column', md: reverse ? 'row-reverse' : 'row' },
        }}>
            {/* text */}
            <Box sx={{ flex: { xs: '1 1 auto', md: '0 0 500px' }, maxWidth: { md: 500 } }}>
                <Typography sx={{ color: '#08C076', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', mb: 1.25 }}>
                    {label}
                </Typography>
                <Typography variant="h5" sx={{ color: '#111', fontWeight: 600, lineHeight: 1.3, mb: 1.5 }}>
                    {title}
                </Typography>
                <Typography sx={{ color: '#555', fontSize: 14, lineHeight: 1.75 }}>
                    {body}
                </Typography>
            </Box>
            <Box sx={{ flex: { xs: '1 1 auto', md: '0 0 500px' }, maxWidth: { md: 500 }, width: '100%' }}>
                <Box sx={{
                    background: '#f5f7fc', borderRadius: 2.5, overflow: 'hidden',
                    border: '1px solid #e8edf5', height: 280,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <Box component="img" src={img} alt={imgAlt} sx={{
                        width: '100%', height: '100%', objectFit: 'contain', p: 2,
                    }} />
                </Box>
            </Box>
        </Box>
    );
}

function Stories() {
    const stories = [
        {
            label: 'Áætlun',
            title: 'Búðu til fjárhagsáætlun á nokkrum mínútum',
            body: 'Kerfið hjálpar þér að setja upp áætlun eftir flokkum. Samanburður við raunverulegar tekjur og gjöld sýnir þér hvar þú stendur.',
            img: '/images/budget.png',
            imgAlt: 'Áætlunarleiðsögn og flokkayfirsýn',
            reverse: false,
        },        
        {
            label: 'Innheimta',
            title: 'Mánaðarleg innheimta á húsgjöldum',
            body: 'Mánaðarleg innheimta er reiknuð út frá áætlun á hverja íbúð — kerfið sér um rest. Sjáðu hverjir hafa greitt og hverjir eru í vanskilum.',
            img: '/images/collection.png',
            imgAlt: 'Innheimtukröfur með stöðu hverrar íbúðar',
            reverse: true,
        },
        {
            label: 'Yfirlit',
            title: 'Fjárhagsleg yfirsýn yfir allt árið',
            body: 'Sjálfvirkar skýrslur sýna tekjur og gjöld eftir mánuðum og flokkum. Alltaf uppfært. Alltaf aðgengilegt.',
            img: '/images/overview.png',
            imgAlt: 'Mánaðarlegar og árlegar fjárhagsskýrslur',
            reverse: false,
        },
    ];

    return (
        <Box id="stories" sx={{ background: '#fff', scrollMarginTop: '64px' }}>
            {stories.map((s, i) => (
                <Box key={s.label} sx={{ borderTop: i === 0 ? 'none' : '1px solid #f0f0f0' }}>
                    <StoryRow {...s} />
                </Box>
            ))}
        </Box>
    );
}

function FeatureGrid() {
    const features = [
        { icon: BusinessOutlinedIcon,        title: 'Húsfélag',          desc: 'Skrá og stjórna upplýsingum um húsfélagið, formann og gjaldkera.' },
        { icon: HomeOutlinedIcon,            title: 'Íbúðir',            desc: 'Skrá íbúðir, eignarhlutfall og greiðsluskyldu hverrar einingar.' },
        { icon: GroupOutlinedIcon,           title: 'Eigendur',          desc: 'Tengja eigendur og greiðendur við íbúðir, með öruggri aðgangsstýringu.' },
        { icon: ReceiptLongOutlinedIcon,     title: 'Innheimta',         desc: 'Mánaðarleg innheimta á húsgjöldum með yfirlit yfir stöðu hverrar íbúðar.' },
        { icon: AssessmentOutlinedIcon,      title: 'Áætlun',            desc: 'Árleg fjárhagsáætlun eftir flokkum með samanburði við raunveruleg útgjöld.' },
        { icon: CreditCardOutlinedIcon,      title: 'Færslur',           desc: 'Flytja inn bankafærslur og flokka þær sjálfvirkt með á útgjaldaflokka.' },
        { icon: BarChartOutlinedIcon,        title: 'Yfirlit',           desc: 'Mánaðarlegar og árlegar fjárhagsskýrslur — alltaf uppfærðar.' },
        { icon: AccountBalanceOutlinedIcon,  title: 'Bankareikningar',   desc: 'Fylgjast með bankareikningum húsfélagsins, tekjum og útgjöldum félagsins.' },
        { icon: LabelOutlinedIcon,           title: 'Flokkunarreglur',   desc: 'Sjálfvirk flokkun færslna af bankareikningnum á útgjaldaflokka og bókhaldslykla — sparar tíma.' },
    ];

    return (
        <Box sx={{ background: '#fafafa', borderTop: '1px solid #eee', borderBottom: '1px solid #eee' }}>
            <Box sx={{ maxWidth: 1060, mx: 'auto', px: { xs: 3, md: 5 }, py: { xs: 5, md: 8 } }}>
                <Typography variant="h5" sx={{ fontWeight: 600, color: '#111', mb: 0.75 }}>
                    Allt sem húsfélag þarfnast
                </Typography>
                <Typography sx={{ fontSize: 14, color: '#888', mb: 4.5 }}>
                    Áætlun, innheimta og fjárhagur — ein lausn
                </Typography>
                <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                    gap: '1px',
                    background: '#e8e8e8',
                    border: '1px solid #e8e8e8',
                    borderRadius: 2.5,
                    overflow: 'hidden',
                }}>
                    {features.map(f => {
                        const Icon = f.icon;
                        return (
                            <Box key={f.title} sx={{ background: '#fff', p: { xs: 2.5, md: 3 } }}>
                                <Box sx={{
                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                    width: 40, height: 40, borderRadius: 2,
                                    background: '#eef1f8', mb: 1.5,
                                }}>
                                    <Icon sx={{ fontSize: 22, color: '#1D366F' }} />
                                </Box>
                                <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#111', mb: 0.625 }}>{f.title}</Typography>
                                <Typography sx={{ fontSize: 12, color: '#777', lineHeight: 1.55 }}>{f.desc}</Typography>
                            </Box>
                        );
                    })}
                </Box>
            </Box>
        </Box>
    );
}

function FaqItem({ question, answer }) {
    const [open, setOpen] = useState(false);
    return (
        <Box
            onClick={() => setOpen(o => !o)}
            sx={{ borderBottom: '1px solid #e8e8e8', cursor: 'pointer', '&:hover .faq-q': { color: '#1D366F' } }}
        >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 2.5 }}>
                <Typography className="faq-q" sx={{
                    fontSize: { xs: 14, md: 15 }, fontWeight: 500,
                    color: open ? '#1D366F' : '#111',
                    transition: 'color 0.15s',
                    pr: 3,
                }}>
                    {question}
                </Typography>
                <Box sx={{
                    flexShrink: 0, width: 28, height: 28, borderRadius: '50%',
                    border: '1.5px solid', borderColor: open ? '#1D366F' : '#ccc',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: open ? '#1D366F' : '#aaa',
                    transition: 'all 0.15s',
                }}>
                    {open
                        ? <RemoveIcon sx={{ fontSize: 14 }} />
                        : <AddIcon sx={{ fontSize: 14 }} />}
                </Box>
            </Box>
            <Collapse in={open}>
                <Typography sx={{ fontSize: 14, color: '#555', lineHeight: 1.75, pb: 2.5, pr: { md: 8 } }}>
                    {answer}
                </Typography>
            </Collapse>
        </Box>
    );
}

function Pitch() {
    const points = [
        { kw: 'Sjálfvirkni',           txt: 'Settu upp reksturinn einu sinni — kerfið sér um að reikna greiðslur í hússjóðinn, innheimtu og bókhaldið sjálfkrafa.' },
        { kw: '24/7 aðgangur',         txt: 'Eigendur íbúða fá aðgang að einföldu yfirliti um húsfélagið og ársskýrslu fyrir aðalfund.' },
        { kw: 'Fullt af sparnaði',     txt: 'Húsfjelagið er miklu ódýrara en hefðbundin húsfélagaþjónusta — og krefst engrar sérþekkingar.' },
        { kw: 'Einfaldleiki',          txt: 'Ef eitthvað þarfnast athygli færðu tilkynningu í tölvupósti — þú þarft ekki að fylgjast stöðugt með.' },
    ];

    return (
        <Box sx={{ background: '#fff', borderTop: '1px solid #eee', borderBottom: '1px solid #eee' }}>
            <Box sx={{ maxWidth: 1060, mx: 'auto', px: { xs: 3, md: 5 }, py: { xs: 7, md: 11 } }}>
                {/* Tag */}
                <Box component="span" sx={{
                    display: 'inline-block',
                    border: '1px solid #dde3f0', borderRadius: '20px',
                    px: 1.75, py: 0.5, fontSize: 11, fontWeight: 600,
                    color: '#1D366F', letterSpacing: '0.04em', mb: 3,
                }}>
                    Ekki eyða frítímanum þínum í sjálfboðastarf
                </Box>

                {/* Headline */}
                <Typography sx={{
                    fontSize: { xs: 28, md: 42 }, fontWeight: 300,
                    color: '#111', lineHeight: 1.2, mb: 1.25,
                    letterSpacing: '-0.02em',
                }}>
                    Húsfélagið þitt {' '}
                    <Box component="span" sx={{ fontWeight: 700, color: '#1D366F' }}>
                        sjálfvirkt
                    </Box>
                </Typography>

                {/* Subtitle */}
                <Typography sx={{
                    fontSize: { xs: 15, md: 17 }, color: '#666',
                    mb: { xs: 5, md: 7 }, maxWidth: 540, lineHeight: 1.6,
                }}>
                    Einfaldaðu reksturinn — láttu kerfið sjá um restina.
                </Typography>

                {/* 4-point grid */}
                <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                    gap: { xs: 4, md: 5 },
                }}>
                    {points.map(p => (
                        <Box key={p.kw} sx={{ display: 'flex', gap: 2 }}>
                            <Box sx={{
                                flexShrink: 0, width: 3, borderRadius: 4,
                                background: '#08C076', mt: 0.5, alignSelf: 'stretch',
                                maxHeight: 60,
                            }} />
                            <Box>
                                <Typography sx={{
                                    fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                                    textTransform: 'uppercase', color: '#1D366F', mb: 0.75,
                                }}>
                                    {p.kw}
                                </Typography>
                                <Typography sx={{ fontSize: 14, color: '#555', lineHeight: 1.7 }}>
                                    {p.txt}
                                </Typography>
                            </Box>
                        </Box>
                    ))}
                </Box>
            </Box>
        </Box>
    );
}

function Pricing({ onSignup }) {
    const perks = [
        'Frítt að prufa í 30 daga — ekkert kreditkort þarf',
        '50% afsláttur fyrstu 6 mánuðina eftir prufutíma',
        'Ekkert uppsagnarfrestur — segðu upp hvenær sem er',
        'Fullur aðgangur frá fyrsta degi',
    ];

    return (
        <Box sx={{ background: '#fafafa', borderTop: '1px solid #eee', borderBottom: '1px solid #eee' }}>
            <Box sx={{ maxWidth: 1060, mx: 'auto', px: { xs: 3, md: 5 }, py: { xs: 6, md: 10 }, textAlign: 'center' }}>
                <Typography sx={{ color: '#08C076', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', mb: 1.5 }}>
                    Verðlag
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 600, color: '#111', mb: 0.75 }}>
                    Einfalt og gegnsætt verðlag
                </Typography>
                <Typography sx={{ fontSize: 14, color: '#888', mb: 5 }}>
                    Greiðir einungis fyrir íbúðir sem eru skráðar. Ekkert leitt smálettur.
                </Typography>

                <Box sx={{
                    maxWidth: 480, mx: 'auto',
                    background: '#1D366F', borderRadius: 3,
                    overflow: 'hidden', boxShadow: '0 12px 40px rgba(29,54,111,0.25)',
                }}>
                    {/* Price */}
                    <Box sx={{ px: 4, pt: 4, pb: 3.5, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 0.75, mb: 0.75 }}>
                            <Typography sx={{ color: '#fff', fontSize: 52, fontWeight: 700, lineHeight: 1 }}>490</Typography>
                            <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 18, fontWeight: 400, mb: 0.75 }}>kr.</Typography>
                        </Box>
                        <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: 14 }}>
                            á mánuði fyrir hverja íbúð
                        </Typography>
                    </Box>

                    {/* Perks */}
                    <Box sx={{ px: 4, py: 3.5 }}>
                        {perks.map(p => (
                            <Box key={p} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1.75 }}>
                                <Box sx={{
                                    flexShrink: 0, width: 20, height: 20, borderRadius: '50%',
                                    background: 'rgba(8,192,118,0.2)', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center', mt: '1px',
                                }}>
                                    <Typography sx={{ color: '#08C076', fontSize: 12, fontWeight: 700, lineHeight: 1 }}>✓</Typography>
                                </Box>
                                <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: 13.5, lineHeight: 1.5 }}>{p}</Typography>
                            </Box>
                        ))}

                        <Button onClick={onSignup} fullWidth sx={{
                            mt: 1, background: '#08C076', color: '#fff',
                            borderRadius: '24px', py: 1.375, fontSize: 14, fontWeight: 600,
                            textTransform: 'none',
                            '&:hover': { background: '#06a866' },
                        }}>
                            Byrjaðu frítt →
                        </Button>
                        <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, mt: 1.5, textAlign: 'center' }}>
                            Ekkert kreditkort þarf við skráningu
                        </Typography>
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}

function Faq() {
    const items = [
        {
            question: 'Hvað kostar kerfið?',
            answer: '490 kr. á mánuði fyrir hverja skráða íbúð. Þú getur prófað kerfið frítt í 30 daga — ekkert kreditkort þarf. Fyrstu 6 mánuðina eftir prufutíma færðu 50% afslátt. Ekkert uppsagnarfrestur — þú getur sagt upp hvenær sem er.',
        },
        {
            question: 'Þarf ég að setja upp eitthvað til að byrja?',
            answer: 'Já, þú skráir þig inn, stofnar húsfélagið þitt með kennitölu ásamt upplýsingum um formann og byrjar að nota kerfið strax í vafranum.',
        },
        {
            question: 'Get ég flutt inn gögn frá banka?',
            answer: 'Já. Kerfið styður innflutning á bankafærslum frá Arion, Íslandsbanka, og Landsbankanum. Færslur eru flokkaðar sjálfvirkt á útgjaldaflokka og bókhaldslykla.',
        },
        {
            question: 'Hvernig virkar innheimtan?',
            answer: 'Þú stillir upp áætlun fyrir húsfélagið og kerfið reiknar út mánaðarlegar greiðslur fyrir hverja íbúð. Kerfið heldur utan um stöðu hvers íbúðar og sýnir þér hverjir eru búnir að greiða og hverjir ekki.',
        },
        {
            question: 'Er hægt að hafa fleiri en einn notanda?',
            answer: 'Já. Hægt er að veita fleiri notendum aðgang að húsfélaginu með mismunandi réttindum — stjórnanda, gjaldkera eða venjulegum notanda.',
        },
        {
            question: 'Eru gögnin mín örugg?',
            answer: 'Við leggjum mikla áherslu á öryggi og persónuvernd. Við tryggjum að gögn séu geymd innan Evrópu og í samræmi við íslenskar og evrópskar reglur (GDPR).',
        },
    ];

    return (
        <Box sx={{ background: '#fff', borderTop: '1px solid #eee' }}>
            <Box sx={{ maxWidth: 780, mx: 'auto', px: { xs: 3, md: 5 }, py: { xs: 6, md: 10 } }}>
                <Typography sx={{
                    color: '#08C076', fontSize: 10, fontWeight: 700,
                    letterSpacing: '0.1em', textTransform: 'uppercase', mb: 1.5,
                }}>
                    Spurt og svarað
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 600, color: '#111', mb: 5 }}>
                    Algengar spurningar
                </Typography>
                <Box sx={{ borderTop: '1px solid #e8e8e8' }}>
                    {items.map(item => <FaqItem key={item.question} {...item} />)}
                </Box>
            </Box>
        </Box>
    );
}

function Footer({ onSignup }) {
    return (
        <Box sx={{ background: '#1D366F', pt: 6, pb: 0 }}>
            <Box sx={{
                maxWidth: 1060, mx: 'auto', px: { xs: 3, md: 5 },
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                gap: 4, pb: 4,
                flexDirection: { xs: 'column', sm: 'row' },
            }}>
                <Box>
                    <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 16, letterSpacing: '0.06em', mb: 0.75 }}>
                        HÚSFJELAGIÐ
                    </Typography>
                    <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, mb: 0.5 }}>
                        Hugbúnaður fyrir íslensk húsfélög
                    </Typography>
                    <Typography sx={{ fontSize: 12 }}>
                        <a href={['mailto', 'info@husfjelag.is'].join(':')}
                           style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>
                            {'info'}<span aria-hidden="true">&#64;</span>{'husfjelag.is'}
                        </a>
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: { xs: 'flex-start', sm: 'flex-end' }, gap: 1.5 }}>
                    <Button onClick={onSignup} sx={{
                        background: '#08C076', color: '#fff', borderRadius: '20px',
                        px: 2, py: 0.75, fontSize: 12, fontWeight: 600, textTransform: 'none',
                        '&:hover': { background: '#06a866' },
                    }}>
                        Innskráning →
                    </Button>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <Link to="/skilmalar" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, textDecoration: 'none' }}>Skilmálar</Link>
                        <Link to="/personuvernd" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, textDecoration: 'none' }}>Persónuvernd</Link>
                    </Box>
                </Box>
            </Box>
            <Box sx={{
                maxWidth: 1060, mx: 'auto', px: { xs: 3, md: 5 },
                borderTop: '1px solid rgba(255,255,255,0.1)', py: 2,
            }}>
                <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>
                    © {new Date().getFullYear()} Húsfjelagið ehf. · kt. 630218-0120
                </Typography>
            </Box>
        </Box>
    );
}

export default function HomePage() {
    const navigate = useNavigate();
    const [mini, setMini] = useState(false);
    const onSignup = () => navigate('/login');

    useEffect(() => {
        const handler = () => setMini(window.scrollY > 60);
        window.addEventListener('scroll', handler, { passive: true });
        return () => window.removeEventListener('scroll', handler);
    }, []);

    return (
        <Box sx={{ minHeight: '100vh', background: '#fff' }}>
            <CtaBar mini={mini} onSignup={onSignup} />
            <Hero onSignup={onSignup} />
            <Pitch />
            <Stories />
            <FeatureGrid />
            <Pricing onSignup={onSignup} />
            <Faq />
            <Footer onSignup={onSignup} />
        </Box>
    );
}
