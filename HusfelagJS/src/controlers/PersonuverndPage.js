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

export default function PersonuverndPage() {
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
                    Persónuvernd
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#111', mb: 0.75 }}>
                    Persónuverndarstefna
                </Typography>
                <Typography sx={{ fontSize: 13, color: '#888', mb: 5 }}>
                    Síðast uppfært: 2. maí 2026
                </Typography>

                <Box sx={{ borderTop: '1px solid #eee', pt: 4 }}>

                    <Section n="1" title="Inngangur">
                        <P>
                            Húsfjelagið ehf. (hér eftir „Húsfjelagið", „við" eða „okkur") leggur áherslu á að vernda persónuupplýsingar og fer með þær í samræmi við lög nr. 90/2018 um persónuvernd og vinnslu persónuupplýsinga og almennu persónuverndarreglugerð ESB (GDPR).
                        </P>
                        <P>
                            Þessi stefna lýsir því hvernig við söfnum, vinnum og verndum persónuupplýsingar í tengslum við þjónustu okkar.
                        </P>
                    </Section>

                    <Section n="2" title="Ábyrgðaraðili">
                        <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#1D366F', mb: 0.75 }}>Húsfjelagið ehf.</Typography>
                        <Typography sx={{ fontSize: 14, color: '#444', mb: 0.5 }}>Kennitala: 630218-0120</Typography>
                        <Typography sx={{ fontSize: 14, color: '#444' }}>
                            Netfang: <Email u="info" d="husfjelag.is" />
                        </Typography>
                    </Section>

                    <Section n="3" title="Hlutverk — ábyrgðaraðili og vinnsluaðili">
                        <Ul items={[
                            'Húsfjelagið er ábyrgðaraðili persónuupplýsinga um notendur kerfisins.',
                            'Húsfjelagið er vinnsluaðili persónuupplýsinga sem notendur (t.d. formenn og gjaldkera húsfélaga) skrá um íbúa og félags­menn í húsfélaginu. Húsfélagið sjálft er ábyrgðaraðili þeirra upplýsinga.',
                        ]} />
                    </Section>

                    <Section n="4" title="Hvaða upplýsingum söfnum við">
                        <P><strong>Um notendur:</strong></P>
                        <Ul items={[
                            'Nafn, kennitala, netfang, símanúmer',
                            'Notkunargögn (innskráningar, aðgerðir í kerfinu)',
                        ]} />
                        <P>
                            Auðkenning notenda fer fram hjá ytri auðkenningarþjónustu. <strong>Húsfjelagið geymir ekki lykilorð notenda.</strong>
                        </P>
                        <P>
                            Innheimta er framkvæmd með því að senda reikning á kennitölu húsfélags í netbanka. <strong>Húsfjelagið geymir ekki kortaupplýsingar eða aðrar greiðsluupplýsingar.</strong>
                        </P>
                        <P><strong>Um íbúa/félags­menn (sem notandi skráir):</strong></P>
                        <Ul items={[
                            'Nafn, kennitala, heimilisfang',
                            'Samskiptaupplýsingar (netfang, símanúmer)',
                            'Eignarhluti, fjárhæðir og staða gjalda',
                        ]} />
                    </Section>

                    <Section n="5" title="Tilgangur og lagagrundvöllur">
                        <P>Við vinnum persónuupplýsingar til að:</P>
                        <Ul items={[
                            'veita aðgang að þjónustunni og halda henni virkri,',
                            'innheimta greiðslur fyrir áskrift,',
                            'uppfylla bókhaldsskyldur okkar,',
                            'bæta og þróa þjónustuna,',
                            'senda þjónustutilkynningar til notenda.',
                        ]} />
                    </Section>

                    <Section n="6" title="Miðlun til þriðju aðila">
                        <P>Við miðlum upplýsingum til:</P>
                        <Ul items={[
                            'Bankastofnunar vegna innheimtu reikninga á kennitölu.',
                            'Auðkenningarþjónustu sem sér um innskráningu notenda.',
                            'Hýsingaraðila sem hýsir kerfið (gagnaver innan EES).',
                            'Yfirvalda þegar lög krefja.',
                        ]} />
                        <P>
                            Við seljum aldrei persónuupplýsingar til þriðju aðila og notum þær ekki í markaðssetningu án samþykkis.
                        </P>
                    </Section>

                    <Section n="7" title="Geymslutími">
                        <P>
                            Við geymum persónuupplýsingar á meðan notandi er með virkan aðgang og í allt að 7 ár eftir uppsögn í samræmi við bókhaldslög. Öðrum upplýsingar er eytt þegar tilgangi vinnslunnar er náð.
                        </P>
                    </Section>

                    <Section n="8" title="Öryggi">
                        <P>
                            Við beitum viðeigandi tæknilegum og skipulegum ráðstöfunum til að vernda gögn og upplýsingar, þar á meðal dulkóðun gagna í flutningi og geymslu, aðgangsstýringum og reglulegum öryggis­prófunum.
                        </P>
                    </Section>

                    <Section n="9" title="Réttindi þín">
                        <P>Þú átt rétt á að:</P>
                        <Ul items={[
                            'fá aðgang að upplýsingum um þig,',
                            'fá rangar upplýsingar leiðréttar,',
                            'láta eyða upplýsingum þegar það á við,',
                            'takmarka eða andmæla vinnslu.',
                        ]} />
                        <P>
                            Beiðnir má senda á{' '}
                            <Email u="personuvernd" d="husfjelag.is" />.{' '}
                            Þú átt einnig rétt á að senda kvörtun til{' '}
                            <a href="https://www.personuvernd.is" target="_blank" rel="noopener noreferrer" style={{ color: '#1D366F' }}>Persónuverndar</a>.
                        </P>
                    </Section>

                    <Section n="10" title="Vafrakökur">
                        <P>
                            Vefur Húsfjelagsins notar vafrakökur til að halda innskráningu og bæta notendaupplifun. Notandi getur stillt vafra sinn til að hafna vafrakökum, en það getur skert virkni þjónustunnar.
                        </P>
                    </Section>

                    <Section n="11" title="Breytingar">
                        <P>
                            Húsfjelagið getur uppfært þessa stefnu. Verulegar breytingar eru tilkynntar með minnst 30 daga fyrirvara innan kerfisins eða með tölvupósti. Áframhaldandi notkun eftir gildistöku telst samþykki á breytingum.
                        </P>
                    </Section>

                    {/* Contact */}
                    <Box sx={{ mt: 5, pt: 4, borderTop: '1px solid #eee' }}>
                        <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#1D366F', mb: 1 }}>Húsfjelagið ehf.</Typography>
                        <Typography sx={{ fontSize: 13, color: '#666', mb: 0.5 }}>Kennitala: 630218-0120</Typography>
                        <Typography sx={{ fontSize: 13, color: '#666', mb: 0.25 }}>
                            Almennar fyrirspurnir: <Email u="info" d="husfjelag.is" />
                        </Typography>
                        <Typography sx={{ fontSize: 13, color: '#666' }}>
                            Persónuvernd: <Email u="personuvernd" d="husfjelag.is" />
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
