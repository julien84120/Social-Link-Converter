# Installer Docker pour Social-Link-Converter

[← Retour au README](../README.md)

Ce guide prépare **la machine qui hébergera l'application**, puis permet de lancer le projet. Il ne déclenche aucune installation ni connexion SSH automatiquement. Choisir uniquement la section correspondant à son système, lire les commandes avant de les exécuter et s'arrêter à la première erreur.

## 1. Choisir son installation

| Système | Installation recommandée ici |
| --- | --- |
| Ubuntu | Docker Engine depuis le dépôt APT officiel Docker + plugin Compose |
| Debian | Docker Engine depuis le dépôt APT officiel Docker + plugin Compose |
| Windows | Docker Desktop avec backend WSL 2 et conteneurs Linux |
| macOS Intel ou Apple silicon | Docker Desktop correspondant au processeur |

Git, Docker et **Compose v2** (`docker compose`) sont nécessaires. Docker Desktop fournit les outils Docker et Compose ; sous Linux, le paquet `docker-compose-plugin` est installé explicitement ci-dessous. Utiliser une version récente de Compose prenant en charge `--wait`.

Une connexion Internet est nécessaire pour les téléchargements. Sur un poste ou serveur déjà utilisé, vérifier avec son administrateur avant de modifier Docker : d'autres applications peuvent en dépendre. Docker Desktop possède ses propres conditions d'utilisation ; certains usages professionnels nécessitent un abonnement payant.[3][4]

## 2. Ubuntu — dépôt APT officiel

Utiliser une version et une architecture prises en charge dans la documentation officielle Ubuntu de Docker. Les distributions dérivées ne sont pas toutes officiellement prises en charge.[1]

**Installation existante :** les paquets de distribution (`docker.io`, `docker-compose`, `docker-compose-v2`, `docker-doc`, `docker-buildx`, `podman-docker`) et les paquets `containerd` / `runc` installés séparément peuvent entrer en conflit avec les paquets Docker officiels. Avant de continuer, suivre la section « Uninstall old versions » de la source officielle, après avoir évalué l'impact sur les services existants. Ce guide ne les supprime pas aveuglément.[1]

Sur une machine Ubuntu préparée, ouvrir un terminal avec un compte autorisé à utiliser `sudo`. Exécuter ces commandes dans l'ordre. Elles ajoutent la clé et le dépôt officiels puis installent Docker ; `git` est ajouté pour cloner le projet.[1]

```sh
sudo apt update
sudo apt install ca-certificates curl git
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

sudo tee /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF

sudo apt update
sudo apt install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Le téléchargement ci-dessus est celui d'une **clé de signature**, pas d'un script exécuté par un shell. Aucun `curl | sh` n'est nécessaire.

Passer à la section **4. Démarrer Docker et gérer les droits Linux**.

## 3. Debian — dépôt APT officiel

Utiliser une version et une architecture prises en charge dans la documentation officielle Debian de Docker. Pour Debian testing ou une distribution dérivée, suivre les adaptations du nom de version indiquées dans cette documentation, sans réutiliser le dépôt Ubuntu.[2]

**Installation existante :** vérifier les conflits éventuels avec `docker.io`, `docker-compose`, `docker-doc`, `docker-buildx`, `podman-docker`, `containerd` et `runc`. Si nécessaire, appliquer la section « Uninstall old versions » de la documentation officielle après avoir sauvegardé et évalué les services concernés.[2]

Dans un terminal disposant de `sudo`, exécuter successivement les commandes officielles de configuration APT et d'installation, avec `git` en complément.[2]

```sh
sudo apt update
sudo apt install ca-certificates curl git
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

sudo tee /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/debian
Suites: $(. /etc/os-release && echo "$VERSION_CODENAME")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF

sudo apt update
sudo apt install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

## 4. Démarrer Docker et gérer les droits Linux

Vérifier le service, le démarrer s'il est arrêté, puis tester le moteur et Compose.[1][2]

```sh
sudo systemctl status docker
# Si le service n'est pas actif :
sudo systemctl start docker

sudo docker run --rm hello-world
sudo docker compose version
sudo docker info
```

`hello-world` télécharge une image de test et doit afficher son message de confirmation. Avec `--rm`, son conteneur est supprimé après exécution ; l'image reste en cache. Si `systemctl status` ouvre un écran de consultation, appuyer sur `q` pour le quitter.

Deux possibilités pour la suite :

- **Conserver `sudo`** : remplacer chaque commande `docker …` du README par `sudo docker …`. Exécuter Git et l'édition des fichiers avec son utilisateur normal.
- **Autoriser son utilisateur à utiliser Docker sans `sudo`** : uniquement si l'on accepte que le groupe `docker` donne des privilèges équivalents à ceux de `root`.[5]

Pour cette seconde option, exécuter avec son utilisateur habituel :[5]

```sh
sudo groupadd --force docker
sudo usermod -aG docker "$USER"
```

Se **déconnecter complètement puis se reconnecter** pour appliquer l'appartenance au groupe ; une simple nouvelle fenêtre de terminal ne suffit pas toujours. Vérifier ensuite :[5]

```sh
docker run --rm hello-world
docker info
docker compose version
```

Ne pas utiliser `chmod 666` sur le socket Docker. Pour un moteur sans privilèges root, consulter les instructions « Rootless mode » accessibles depuis la documentation de post-installation Docker.[5]

### Attention au pare-feu

Les ports publiés par Docker peuvent contourner les règles habituelles d'UFW ou de firewalld. Ne pas supposer qu'un simple refus UFW protège un port Docker : consulter les recommandations réseau liées depuis les guides officiels et appliquer les règles adaptées à l'environnement.[1][2]

Pour ce projet, `BIND_ADDRESS=127.0.0.1` dans `.env` permet de limiter la publication à l'hôte ; `0.0.0.0` publie sur toutes les interfaces. Ne pas ouvrir le port sur Internet simplement pour résoudre un problème d'accès local.

## 5. Windows — Docker Desktop avec WSL 2

### Préparer Windows et WSL

Vérifier les exigences actualisées sur la page Docker officielle : version de Windows encore prise en charge, virtualisation matérielle activée dans le BIOS/UEFI, mémoire suffisante et version récente de WSL. Docker Desktop n'est pas destiné à Windows Server.[3]

Dans **PowerShell en administrateur**, vérifier WSL :[3]

```powershell
wsl --version
```

Si WSL n'est pas installé :[3]

```powershell
wsl --install
```

Redémarrer Windows si demandé et terminer les éventuelles étapes de configuration WSL. Si WSL est déjà installé mais doit être mis à jour :[3]

```powershell
wsl --update
wsl --version
```

### Installer et démarrer Docker Desktop

1. Télécharger l'installateur adapté à son architecture depuis la [page officielle Windows](https://docs.docker.com/desktop/setup/install/windows-install/).[3]
2. Ouvrir `Docker Desktop Installer.exe` et suivre l'assistant. Choisir **Use WSL 2 instead of Hyper-V** lorsque l'option est proposée.[3]
3. Lancer **Docker Desktop** depuis le menu Démarrer, lire et accepter ses conditions si elles conviennent ; l'installation seule ne démarre pas nécessairement le moteur.[3]
4. Utiliser le moteur de **conteneurs Linux**, nécessaire à l'image Nginx du projet, et attendre que Docker soit opérationnel.[3]

Alternative en ligne de commande, **après téléchargement** de l'installateur officiel : depuis son dossier, la commande PowerShell officielle suivante lance l'installation par utilisateur et attend sa fin.[3]

```powershell
Start-Process '.\Docker Desktop Installer.exe' -Wait -ArgumentList 'install', '--user'
```

Installer également Git pour Windows depuis [le site officiel Git](https://git-scm.com/downloads/win), puis rouvrir PowerShell. Pour ce guide, utiliser Git et Docker depuis **le même terminal PowerShell**, sans mélanger chemins Windows et chemins WSL.

```powershell
git --version
docker version
docker compose version
docker info
docker run --rm hello-world
```

Si `docker info` échoue, ne pas poursuivre : vérifier Docker Desktop et WSL. Les commandes de lancement compatibles PowerShell 5.1 figurent à la section 7.

## 6. macOS — Docker Desktop Intel ou Apple silicon

### Télécharger la bonne version

Dans le menu Apple → **À propos de ce Mac**, identifier le processeur :

- **Puce Apple (M1, M2, etc.)** : choisir **Docker Desktop for Mac with Apple silicon**.
- **Processeur Intel** : choisir **Docker Desktop for Mac with Intel chip**.

Les deux téléchargements se trouvent sur la [page officielle macOS](https://docs.docker.com/desktop/setup/install/mac-install/), qui précise également les versions de macOS et la mémoire nécessaires.[4]

### Installation graphique recommandée

1. Télécharger le fichier `Docker.dmg` adapté, l'ouvrir puis glisser Docker dans **Applications**.[4]
2. Ouvrir **Docker.app** depuis Applications ; lire et accepter les conditions si elles conviennent, puis terminer la configuration proposée.[4]
3. Attendre que Docker Desktop soit démarré et rouvrir le terminal si la commande `docker` n'est pas encore trouvée.

Alternative officielle en terminal, **uniquement après avoir téléchargé le bon `Docker.dmg` et s'être placé dans son dossier** :[4]

```sh
sudo hdiutil attach Docker.dmg
sudo /Volumes/Docker/Docker.app/Contents/MacOS/install
sudo hdiutil detach /Volumes/Docker
```

Ouvrir ensuite Docker depuis Applications. Sur Apple silicon, Rosetta 2 n'est pas strictement nécessaire à Docker Desktop ; Docker la recommande pour certains outils optionnels. Si nécessaire, la commande officielle est `softwareupdate --install-rosetta`, à exécuter volontairement et après lecture des conditions affichées.[4]

Installer Git si `git --version` échoue, en suivant [les options officielles Git pour macOS](https://git-scm.com/downloads/mac). Puis vérifier :

```sh
git --version
docker version
docker compose version
docker info
docker run --rm hello-world
```

Ne pas confondre la présence du client `docker` avec un moteur actif : `docker info` doit réussir. Aucune installation Docker sur votre Mac n'est effectuée par ce document.

## 7. Lancer Social-Link-Converter

### Contrôles préalables

- `git --version` fonctionne.
- `docker info` fonctionne avec les droits choisis (`sudo` sous Linux si nécessaire).
- `docker compose version` fonctionne ; `docker compose up --help` propose `--wait`.
- Docker utilise des conteneurs Linux.
- Le port `8888` est libre, ou un autre port sera configuré dans `.env`.

### Première installation sous Linux/macOS

Avec Docker accessible sans `sudo` :

```sh
git clone https://github.com/julien84120/Social-Link-Converter.git social-link-converter && cd social-link-converter && docker compose up -d --build --wait
```

Si Linux exige encore `sudo`, utiliser :

```sh
git clone https://github.com/julien84120/Social-Link-Converter.git social-link-converter && cd social-link-converter && sudo docker compose up -d --build --wait
```

### Première installation sous Windows PowerShell

Compatible PowerShell 5.1 et versions ultérieures :

```powershell
git clone https://github.com/julien84120/Social-Link-Converter.git social-link-converter
if ($LASTEXITCODE -ne 0) { throw "Échec du clonage Git." }
Set-Location social-link-converter -ErrorAction Stop
docker compose up -d --build --wait
if ($LASTEXITCODE -ne 0) { throw "Échec du lancement Docker." }
```

### Configurer avant de démarrer

Pour restreindre l'accès ou changer de port, procéder manuellement : cloner le dépôt, entrer dans `social-link-converter`, créer `.env` avec un éditeur, puis seulement lancer Compose.

```dotenv
PORT=8888
BIND_ADDRESS=127.0.0.1
```

Sans configuration, `PORT=8888` et `BIND_ADDRESS=0.0.0.0` sont les valeurs par défaut. `127.0.0.1` limite l'accès à l'hôte ; `0.0.0.0` écoute sur toutes les interfaces. Dans le dossier du projet :

```sh
docker compose config
docker compose up -d --build --wait
docker compose ps
docker inspect --format '{{.State.Health.Status}}' social_link_converter
```

Le service **`link-converter`**, conteneur **`social_link_converter`**, doit être en cours d'exécution et sa santé doit devenir `healthy`. Ouvrir **http://localhost:8888**, puis vérifier que la page et le logo s'affichent. Depuis un autre appareil, utiliser `http://IP_DE_L_HOTE:8888` avec une adresse réelle et joignable, un bind approprié et les autorisations réseau nécessaires.

Ces commandes ne déploient rien automatiquement sur un serveur SSH.

## 8. Entretien et problèmes fréquents

Depuis le dossier cloné :

```sh
# Diagnostic
docker compose ps
docker compose logs --tail=100 -f link-converter

# Mise à jour POSIX ou PowerShell 7
git pull --ff-only && docker compose up -d --build --wait

# Arrêt temporaire, reprise, redémarrage
docker compose stop
docker compose start
docker compose restart link-converter

# Désinstallation non destructive du service
docker compose down
```

Les trois commandes d'arrêt/reprise/redémarrage sont des actions distinctes : choisir celle souhaitée. `down` seul retire le conteneur et le réseau du projet, pas le dépôt, `.env` ni l'image locale.

### Désinstallation complète

**Suppression définitive :** sauvegarder les modifications à conserver. Depuis le **dossier parent** de `social-link-converter`, sur la machine Docker, sous Linux/macOS :

```sh
cd social-link-converter && docker compose down --rmi all --volumes && cd .. && rm -rf -- social-link-converter
```

Cette commande retire les ressources Compose de l'application (conteneur, réseau, image et volumes gérés par le projet), puis le dossier cloné avec `.env` et son historique Git local. Le projet fourni n'utilise aucun volume. Si Docker échoue, le dossier est conservé. Sous Linux, utiliser `sudo docker compose` si nécessaire ; adapter le nom du dossier si vous l'avez renommé.

Pour **Windows PowerShell**, ainsi que les précautions concernant le nom du projet Compose, consulter la [procédure complète du README](../README.md#désinstallation-complète-de-lapplication).

Docker lui-même, le dépôt GitHub, les autres projets, les volumes externes, les images de base partagées et le cache de construction sont conservés. Il ne s'agit pas d'un effacement sécurisé de toutes les traces : aucun nettoyage Docker global n'est exécuté.

### Mise à jour sous PowerShell 5.1

Pour la mise à jour sous **PowerShell 5.1**, utiliser les gardes suivantes, et non `&&` :

```powershell
git pull --ff-only
if ($LASTEXITCODE -ne 0) { throw "Échec de la mise à jour Git." }
docker compose up -d --build --wait
if ($LASTEXITCODE -ne 0) { throw "Échec de la reconstruction Docker." }
```

Conserver `.env` et sauvegarder les modifications locales avant une mise à jour. Vérifier de nouveau `docker compose ps` et la page après chaque changement. Une modification de `.env` nécessite `up`, pas uniquement `restart`.

| Problème | À faire |
| --- | --- |
| Démon inaccessible | Ouvrir Docker Desktop ou démarrer le service Linux, puis réessayer `docker info`. Vérifier aussi `docker context show`. |
| Droits Linux insuffisants | Utiliser `sudo docker …` ou la configuration de groupe expliquée plus haut, sans ouvrir les droits du socket à tous. |
| Compose absent / `--wait` inconnu | Mettre à jour Docker Desktop ou installer/mettre à jour `docker-compose-plugin` depuis le dépôt officiel Linux. |
| Port déjà occupé | Modifier `PORT` dans `.env`, par exemple `8889`, et relancer `up`. Adapter ensuite l'URL du navigateur. |
| Adresse d'écoute invalide | Vérifier que `BIND_ADDRESS` appartient à l'hôte, ou choisir `127.0.0.1` / `0.0.0.0` selon l'accès voulu. |
| Accès local possible, accès distant impossible | Vérifier bind, IP de l'hôte, port, règles réseau et éventuel VPN. Tenir compte des limites pare-feu Docker sous Linux. |
| Erreur HTTPS | Le service écoute en **HTTP** ; utiliser `http://`. Aucun certificat TLS n'est automatiquement installé. |
| Presse-papiers bloqué sur HTTP | Sélectionner le résultat puis copier manuellement avec `Ctrl+C` / `Cmd+C`, ou configurer séparément un accès HTTPS approprié. |
| Service `unhealthy` ou attente échouée | Lire les journaux et `docker inspect social_link_converter`, corriger l'erreur puis relancer. |
| Git refuse le clonage ou la mise à jour | Un dossier existant ne doit pas être écrasé ; examiner `git status` et préserver les modifications locales. |
| Aperçus Discord indisponibles | La santé Docker ne mesure pas les services tiers de conversion ; consulter les limites décrites dans le README. |

La conversion reste locale au navigateur, mais les liens générés impliquent des services tiers lorsqu'ils sont ouverts ou partagés. Voir le [README](../README.md) pour les correspondances de domaines, la traduction `/fr`, la suppression complète des paramètres de requête et les limites de confidentialité.

## Sources

[1] https://docs.docker.com/engine/install/ubuntu
[2] https://docs.docker.com/engine/install/debian
[3] https://docs.docker.com/desktop/setup/install/windows-install
[4] https://docs.docker.com/desktop/setup/install/mac-install
[5] https://docs.docker.com/engine/install/linux-postinstall
