import React from 'react';
import { Link } from 'react-router-dom';
import { Box, Typography } from '@mui/material';

function Email({ u, d, style }) {
    return (
        <a href={['mailto', u + '@' + d].join(':')} style={{ color: '#1D366F', ...style }}>
            {u}<span aria-hidden="true">&#64;</span>{d}
        </a>
    );
}

function Section({ n, title, children }) {
    return (
        <Box sx={{ mb: 4 }}>
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#1D366F', mb: 1.25 }}>
                {n}. {title}
            </Typography>
            {children}
        </Box>
    );
}

function P({ children }) {
    return (
        <Typography sx={{ fontSize: 14, color: '#444', lineHeight: 1.8, mb: 1.5 }}>
            {children}
        </Typography>
    );
}

function Ul({ items }) {
    return (
        <Box component="ul" sx={{ pl: 3, mt: 0.5, mb: 1.5 }}>
            {items.map((item, i) => (
                <Box component="li" key={i} sx={{ fontSize: 14, color: '#444', lineHeight: 1.8, mb: 0.5 }}>
                    {item}
                </Box>
            ))}
        </Box>
    );
}

export default function SkilmalarPage() {
    return (
        <Box sx={{ minHeight: '100vh', background: '#fff' }}>
            {/* Top bar */}
            <Box sx={{
                background: '#1D366F', px: 4, py: 1.5,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
            }}>
                <Link to="/" style={{ textDecoration: 'none' }}>
                    <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 15, letterSpacing: '0.06em' }}>
                        HÚSFJELAGIÐ
                    </Typography>
                </Link>
                <Link to="/" style={{ textDecoration: 'none' }}>
                    <Typography sx={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>← Forsíða</Typography>
                </Link>
            </Box>

            {/* Content */}
            <Box sx={{ maxWidth: 780, mx: 'auto', px: { xs: 3, md: 5 }, py: { xs: 6, md: 10 } }}>
                <Typography sx={{ color: '#08C076', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', mb: 1.5 }}>
                    Lögleg skilmálar
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#111', mb: 0.75 }}>
                    Notendaskilmálar
                </Typography>
                <Typography sx={{ fontSize: 13, color: '#888', mb: 5 }}>
                    Síðast uppfært: 2. maí 2026
                </Typography>

                <Box sx={{ borderTop: '1px solid #eee', pt: 4 }}>

                    <Section n="1" title="Almennt">
                        <P>
                            Þessir skilmálar gilda um afnot af hugbúnaðarþjónustu Húsfjelagsins ehf. (hér eftir „Húsfjelagið" eða „þjónustan"), sem er vefbundin þjónusta (SaaS) ætluð húsfélögum til að halda utan um fjármál, innheimtu húsgjalda og bókhald.
                        </P>
                        <P>
                            Með því að stofna húsfélag í kerfinu eða nota þjónustuna á annan hátt samþykkir notandinn skilmála þessa.
                        </P>
                    </Section>

                    <Section n="2" title="Aðgangur og notkun">
                        <P>
                            Notandi fær aðgang að þjónustunni gegn greiðslu mánaðargjalds samkvæmt verðskrá hverju sinni. Aðgangurinn er persónulegur og óheimilt er að deila aðgangsupplýsingum með öðrum.
                        </P>
                        <P>
                            Notandi ber ábyrgð á öllum aðgerðum sem framkvæmdar eru með aðgangi hans og á að tilkynna Húsfjelaginu án tafar ef grunur leikur á misnotkun.
                        </P>
                    </Section>

                    <Section n="3" title="Hlutverk Húsfjelagsins">
                        <P>
                            Húsfjelagið veitir aðgang að hugbúnaði til umsýslu húsfélaga. Húsfjelagið er ekki aðili að rekstri húsfélaga, tekur ekki að sér bókhaldseða endurskoðunarþjónustu og veitir ekki lögfræði- eða fjármálaráðgjöf.
                        </P>
                        <P>
                            <strong>Kerfið er ekki löglegt bókhaldskerfi</strong> í skilningi bókhaldslaga nr. 145/1994 og er ekki ætlað að koma í stað slíks kerfis þar sem þess er krafist. Notandi ber ábyrgð á því að uppfylla bókhaldsskyldur sínar með viðeigandi hætti.
                        </P>
                        <P>
                            Notandi ber sjálfur ábyrgð á því að upplýsingar sem hann skráir í kerfið séu réttar og að þær uppfylli kröfur laga, þ.m.t. laga nr. 26/1994 um fjöleignarhús.
                        </P>
                    </Section>

                    <Section n="4" title="Þriðju aðilar og tilvísanir">
                        <P>
                            Kerfið kann að vísa notendum á þjónustu þriðju aðila, svo sem bókhaldsþjónustu, endurskoðendur, þrif, viðhald, tryggingar eða annað. Slíkar tilvísanir eru eingöngu til upplýsinga og fela ekki í sér meðmæli eða ábyrgð af hálfu Húsfjelagsins ehf.
                        </P>
                        <P>
                            Öll viðskipti, samningar og samskipti við þriðju aðila eru alfarið á milli notandans og viðkomandi þjónustuaðila. Húsfjelagið ber <strong>enga ábyrgð</strong> á gæðum, framkvæmd, verðlagningu, tjóni eða öðrum atriðum sem upp kunna að koma í tengslum við slík viðskipti.
                        </P>
                    </Section>

                    <Section n="5" title="Ábyrgðartakmörkun">
                        <P>Þjónustan er veitt „eins og hún er" (<em>as is</em>). Húsfjelagið ber <strong>enga ábyrgð</strong> á:</P>
                        <Ul items={[
                            'því hvernig notandi nýtir sér upplýsingar eða útreikninga úr kerfinu,',
                            'ákvörðunum sem teknar eru á grundvelli gagna í kerfinu,',
                            'tjóni sem rekja má til rangra eða ófullnægjandi gagnafærslu notanda,',
                            'óbeinu tjóni, afleiddu tjóni eða rekstrartapi,',
                            'truflunum á þjónustunni vegna viðhalds, uppfærslna eða atvika sem eru utan stjórnar Húsfjelagsins.',
                        ]} />
                        <P>
                            Heildarábyrgð Húsfjelagsins, ef á reynir, takmarkast við þá fjárhæð sem notandi hefur greitt fyrir þjónustuna síðustu 12 mánuði fyrir tjónsatvik.
                        </P>
                    </Section>

                    <Section n="6" title="Persónuvernd">
                        <P>
                            Húsfjelagið vinnur persónuupplýsingar í samræmi við{' '}
                            <Link to="/personuvernd" style={{ color: '#1D366F' }}>persónuverndarstefnu félagsins</Link>{' '}
                            og lög nr. 90/2018 um persónuvernd og vinnslu persónuupplýsinga. Notandi telst ábyrgðaraðili þeirra persónuupplýsinga sem hann skráir um íbúa og félags­menn í húsfélaginu, en Húsfjelagið er vinnsluaðili.
                        </P>
                    </Section>

                    <Section n="7" title="Verð og greiðslur">
                        <P>
                            Mánaðargjald er innheimt samkvæmt gildandi verðskrá. Húsfjelagið áskilur sér rétt til að breyta verðskrá með minnst 30 daga fyrirvara, sem tilkynnt er með tölvupósti eða innan kerfisins.
                        </P>
                        <P>
                            Ef greiðsla berst ekki getur Húsfjelagið lokað fyrir aðgang að þjónustunni þar til skuld er greidd.
                        </P>
                    </Section>

                    <Section n="8" title="Uppsögn">
                        <P>
                            Notandi getur sagt upp þjónustunni hvenær sem er innan kerfisins. Uppsögn tekur gildi við lok yfirstandandi greiðslutímabils. Ekki er endurgreitt fyrir ónotaðan tíma.
                        </P>
                        <P>
                            Húsfjelagið getur sagt upp samningi með 30 daga fyrirvara, eða fyrirvaralaust ef notandi brýtur skilmála þessa verulega.
                        </P>
                        <P>
                            Eftir uppsögn getur notandi sótt sín gögn úr kerfinu í 30 daga, en að þeim tíma liðnum er heimilt að eyða þeim.
                        </P>
                    </Section>

                    <Section n="9" title="Breytingar á skilmálum">
                        <P>
                            Húsfjelagið getur uppfært þessa skilmála. Breytingar eru tilkynntar með minnst 30 daga fyrirvara innan kerfisins eða með tölvupósti. Áframhaldandi notkun eftir gildistöku telst samþykki á nýjum skilmálum.
                        </P>
                    </Section>

                    <Section n="10" title="Lög og varnarþing">
                        <P>
                            Um skilmála þessa gilda íslensk lög. Komi upp ágreiningur sem ekki verður leystur með samkomulagi skal hann rekinn fyrir Héraðsdómi Reykjavíkur.
                        </P>
                    </Section>

                    {/* Contact */}
                    <Box sx={{ mt: 5, pt: 4, borderTop: '1px solid #eee' }}>
                        <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#1D366F', mb: 1 }}>Húsfjelagið ehf.</Typography>
                        <Typography sx={{ fontSize: 13, color: '#666', mb: 0.5 }}>Kennitala: 630218-0120</Typography>
                        <Typography sx={{ fontSize: 13, color: '#666' }}>
                            Netfang: <Email u="info" d="husfjelag.is" />
                        </Typography>
                    </Box>
                </Box>
            </Box>

            {/* Footer */}
            <Box sx={{ background: '#1D366F', py: 3 }}>
                <Box sx={{ maxWidth: 780, mx: 'auto', px: { xs: 3, md: 5 }, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                    <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>
                        © {new Date().getFullYear()} Húsfjelagið ehf.
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2.5 }}>
                        <Link to="/skilmalar" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, textDecoration: 'none' }}>Skilmálar</Link>
                        <Link to="/personuvernd" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, textDecoration: 'none' }}>Persónuvernd</Link>
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}
