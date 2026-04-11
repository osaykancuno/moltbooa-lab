# MoltBooa Lab — Guida al Deploy

Questa guida ti porta dal codice sul tuo PC all'app online in pochi minuti.
Servono solo 3 account gratuiti: **GitHub**, **Vercel** e **Git** installato.

---

## Passo 0: Installa Git (se non ce l'hai)

1. Vai su https://git-scm.com/downloads
2. Scarica la versione per Windows
3. Installa lasciando tutto di default (clicca "Next" fino alla fine)
4. Riavvia il terminale dopo l'installazione

Per verificare, apri il terminale e scrivi:
```
git --version
```
Se vedi un numero di versione, sei a posto.

---

## Passo 1: Crea un account GitHub

1. Vai su https://github.com
2. Clicca **Sign up** e crea un account gratuito
3. Conferma la tua email

---

## Passo 2: Crea un repository su GitHub

1. Vai su https://github.com/new
2. **Repository name**: `moltbooa-lab`
3. **Description**: `MoltBooa Lab — Born On-chain Owned Agents`
4. Seleziona **Private** (o Public se vuoi che sia visibile a tutti)
5. **NON** selezionare "Add a README file"
6. Clicca **Create repository**
7. Nella pagina che appare, copia l'URL del repo (tipo `https://github.com/TUO-USERNAME/moltbooa-lab.git`)

---

## Passo 3: Carica il codice su GitHub

Apri il terminale (cmd o PowerShell) nella cartella del progetto:

```
cd percorso/della/cartella/progetto
```

Poi esegui questi comandi uno alla volta:

```
git remote add origin https://github.com/TUO-USERNAME/moltbooa-lab.git
```
(sostituisci `TUO-USERNAME` con il tuo username GitHub)

```
git branch -M main
```

```
git push -u origin main
```

Ti chiederà le credenziali GitHub. Inseriscile e aspetta che finisca.

> Se ti da errore sulle credenziali, vai su https://github.com/settings/tokens,
> crea un "Personal access token (classic)" con permesso "repo",
> e usalo come password quando te la chiede.

---

## Passo 4: Crea un account Vercel

1. Vai su https://vercel.com
2. Clicca **Sign Up**
3. Scegli **Continue with GitHub** (usa lo stesso account del Passo 1)
4. Autorizza Vercel ad accedere ai tuoi repo

---

## Passo 5: Deploy su Vercel

1. Vai su https://vercel.com/new
2. Vedrai la lista dei tuoi repository GitHub
3. Trova **moltbooa-lab** e clicca **Import**
4. Nella schermata di configurazione:
   - **Framework Preset**: dovrebbe dire "Next.js" automaticamente
   - **Root Directory**: lascia vuoto (default)
   - Non serve aggiungere variabili d'ambiente
5. Clicca **Deploy**
6. Aspetta 1-2 minuti che il build finisca
7. Quando vedi il segno di spunta verde, la tua app e' online!

Vercel ti dara' un URL tipo: `https://moltbooa-lab.vercel.app`

---

## Passo 6 (opzionale): Dominio personalizzato

Se vuoi un dominio tipo `moltbooa.com`:

1. Compra un dominio su https://www.namecheap.com o https://domains.google
2. Su Vercel, vai in **Settings > Domains**
3. Aggiungi il tuo dominio
4. Vercel ti dira' quali DNS record configurare
5. Vai nel pannello del tuo registrar e aggiungi i record
6. Aspetta qualche minuto per la propagazione DNS

---

## Aggiornare l'app in futuro

Ogni volta che modifichi il codice e vuoi aggiornare l'app online:

```
cd percorso/della/cartella/progetto
git add .
git commit -m "Descrizione della modifica"
git push
```

Vercel rileva automaticamente il push e fa il re-deploy in 1-2 minuti.

---

## Risoluzione problemi comuni

| Problema | Soluzione |
|----------|-----------|
| `git` non riconosciuto | Reinstalla Git e riavvia il terminale |
| Errore push "authentication" | Crea un Personal Access Token su GitHub (vedi Passo 3) |
| Build fallito su Vercel | Clicca sul deploy fallito per vedere i log di errore |
| La pagina non carica i BOOA | Verifica che le API di khora.fun siano raggiungibili |
| Errore 404 sulla simulazione | Verifica che l'URL contenga un token ID valido (0-3332) |

---

## Contatti

- App creata da [@osaykancuno](https://x.com/osaykancuno)
- BOOA: https://www.khora.fun
- Shape Network: https://shape.network
