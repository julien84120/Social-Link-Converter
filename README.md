<p align="center">
  <img src="assets/logo.png" alt="Logo Social-Link-Converter" width="520">
</p>

# Social-Link-Converter

Une petite application web en français pour convertir des liens de réseaux sociaux en liens destinés à améliorer les aperçus dans Discord. La conversion se fait dans le navigateur ; Docker sert simplement les fichiers statiques avec Nginx.

## Fonctionnalités

| Réseau source | Domaine de destination |
| --- | --- |
| X / Twitter | `fixupx.com` |
| Instagram | `kirkstagram.com` |
| TikTok | `vxtiktok.com` |
| Reddit | `vxreddit.com` |

- Coller un lien, choisir les options, puis copier le résultat dans Discord.
- **Traduction française** : ajoute `/fr` uniquement aux liens de publications X/Twitter contenant un chemin de statut (`/status/…`). Ce n'est pas une traduction locale de toutes les pages ou de tous les réseaux.
- **Suppression des paramètres (`removeTrackers`)** : supprime **toute la chaîne de requête** après `?`, et pas seulement les paramètres publicitaires connus. Des paramètres utiles peuvent donc disparaître.

Les domaines de destination sont des services tiers indépendants. Leur disponibilité, la traduction et le rendu des aperçus Discord ne sont pas garantis par ce projet.

## Prérequis

Sur **la machine qui hébergera l'application** :

- Git disponible (`git --version`).
- Docker Engine ou Docker Desktop installé et **démarré** (`docker info` doit réussir).
- Docker Compose v2, via la commande **`docker compose`**, dans une version récente prenant en charge `--wait` (`docker compose version`).
- Une connexion Internet pour cloner le dépôt et télécharger l'image de base au premier lancement ; un port hôte libre, `8888` par défaut.

**Docker n'est pas encore installé ?** Suivre le [guide Ubuntu, Debian, Windows/WSL 2 et macOS](docs/docker-installation.md) avant de continuer. Node.js n'est pas nécessaire pour utiliser la version Docker.

## Démarrage rapide

### Linux / macOS — terminal POSIX

Depuis le dossier dans lequel créer le projet, pour une **première installation** :

```sh
git clone https://github.com/julien84120/Social-Link-Converter.git social-link-converter && cd social-link-converter && docker compose up -d --build --wait
```

### Windows — PowerShell 5.1 ou version ultérieure

Les gardes empêchent de poursuivre si une commande échoue ; `&&` n'est pas disponible dans PowerShell 5.1.

```powershell
git clone https://github.com/julien84120/Social-Link-Converter.git social-link-converter
if ($LASTEXITCODE -ne 0) { throw "Échec du clonage Git." }
Set-Location social-link-converter -ErrorAction Stop
docker compose up -d --build --wait
if ($LASTEXITCODE -ne 0) { throw "Échec du démarrage Docker : consulter les journaux." }
```

Ouvrir **[http://localhost:8888](http://localhost:8888)** sur la machine hôte. Le premier démarrage construit l'image localement à partir du dépôt : aucune image préconstruite du projet sur GHCR n'est requise ou annoncée.

> Par défaut, le port est publié sur **toutes les interfaces** (`0.0.0.0`). Pour un usage limité à cet ordinateur, configurer `BIND_ADDRESS=127.0.0.1` **avant** le lancement, comme ci-dessous. L'application n'ajoute ni authentification ni HTTPS.

Ces commandes s'exécutent sur la machine courante ; elles ne réalisent **aucun déploiement SSH automatique**. Pour un serveur, ouvrir soi-même une session sur celui-ci, puis y suivre les étapes.

## Installation manuelle et configuration

Exécuter chaque étape uniquement si la précédente a réussi :

```sh
git clone https://github.com/julien84120/Social-Link-Converter.git social-link-converter
cd social-link-converter
```

Si le dossier existe déjà, ne pas relancer le clonage : s'y placer et utiliser la procédure de mise à jour.

Facultatif : créer avec un éditeur un fichier **`.env`** à la racine du dépôt, à côté du fichier Compose. Sous Windows, vérifier qu'il ne s'appelle pas `.env.txt`.

```dotenv
PORT=8888
BIND_ADDRESS=127.0.0.1
```

| Variable | Valeur par défaut sans `.env` | Effet |
| --- | --- | --- |
| `PORT` | `8888` | Port accessible sur l'hôte ; le port du conteneur reste `80`. |
| `BIND_ADDRESS` | `0.0.0.0` | Adresse d'écoute sur l'hôte. `127.0.0.1` limite l'accès local ; `0.0.0.0` autorise l'écoute sur toutes les interfaces. |

Pour un port occupé, choisir par exemple `PORT=8889`. Pour un accès depuis le réseau local ou un réseau privé, utiliser une adresse d'interface réellement présente sur l'hôte, ou `0.0.0.0`, et restreindre l'accès réseau de manière appropriée. Une variable déjà exportée dans le terminal peut prendre le pas sur `.env` : vérifier le résultat avec `docker compose config`.

```sh
docker compose config
docker compose up -d --build --wait
docker compose ps
```

`--wait` attend que le service soit prêt selon son contrôle de santé. Le service Compose se nomme **`link-converter`** et le conteneur **`social_link_converter`**.

### Quelle adresse ouvrir ?

- Depuis l'hôte : `http://localhost:8888` (adapter le port si nécessaire).
- Depuis un autre appareil : `http://IP_DE_L_HOTE:8888`, en remplaçant `IP_DE_L_HOTE` par l'adresse réellement joignable de la machine Docker. `localhost` désigne toujours l'appareil sur lequel le navigateur tourne.

- `0.0.0.0` est une adresse d'écoute, pas l'adresse à donner aux visiteurs.

## Vérifier et administrer

Toutes les commandes Compose suivantes s'exécutent **dans le dossier du dépôt**.

```sh
# État du service et port publié
docker compose ps

# Santé détaillée : la valeur attendue est healthy
docker inspect --format '{{.State.Health.Status}}' social_link_converter

# Journaux ; Ctrl+C arrête leur suivi, pas l'application
docker compose logs --tail=100 -f link-converter
```

Vérifier aussi la page et son logo dans le navigateur. Pour tester les réponses HTTP sous Linux/macOS :

```sh
curl --fail --head http://localhost:8888/
curl --fail --head http://localhost:8888/assets/logo.png
```

Sous Windows, utiliser `curl.exe` à la place de `curl` (ou le navigateur). Adapter le port et l'adresse à votre configuration. Un état `healthy` vérifie le serveur local, **pas** les services tiers ni l'accès depuis un autre appareil.

### Mettre à jour

Avant une mise à jour, conserver votre `.env` et sauvegarder vos éventuelles modifications locales. Sous Linux/macOS ou PowerShell 7 :

```sh
git pull --ff-only && docker compose up -d --build --wait
```

Sous PowerShell 5.1 :

```powershell
git pull --ff-only
if ($LASTEXITCODE -ne 0) { throw "Mise à jour Git interrompue ; vérifier les modifications locales." }
docker compose up -d --build --wait
if ($LASTEXITCODE -ne 0) { throw "Échec du redémarrage ; consulter les journaux." }
```

Puis vérifier `docker compose ps` et recharger la page. Si Git refuse la mise à jour, examiner `git status` et résoudre la situation sans effacer vos modifications. Un simple `restart` ne reconstruit pas l'image.

### Arrêter, reprendre, redémarrer, désinstaller

```sh
# Arrêter sans supprimer le conteneur
docker compose stop

# Reprendre un conteneur arrêté
docker compose start

# Redémarrer le service existant
docker compose restart link-converter

# Retirer le conteneur et le réseau du projet
docker compose down
```

`docker compose down` laisse le dépôt, `.env` et l'image locale en place. Pour tout retirer au niveau de l'application, suivre la procédure ci-dessous. Après un changement de `.env`, relancer `docker compose up -d --build --wait`, pas seulement `restart`.

### Désinstallation complète de l'application

> **Attention : suppression définitive.** Sauvegarder auparavant les modifications à conserver. Ces commandes suppriment le conteneur, son réseau Compose, l'image de l'application, les volumes gérés par ce projet et le dossier cloné complet, y compris `.env` et son historique Git local. Le projet fourni ne crée aucun volume. Les volumes externes et les dossiers montés depuis l'extérieur ne sont pas supprimés.

Exécuter sur **la machine Docker**, depuis le **dossier parent** de `social-link-converter` (et non depuis le dossier du projet). Les commandes supposent le nom utilisé par l'installation rapide ; adapter ce nom si le dossier a été renommé. Docker doit être démarré.

**Linux / macOS — en une commande :**

```sh
cd social-link-converter && docker compose down --rmi all --volumes && cd .. && rm -rf -- social-link-converter
```

Si Docker nécessite les droits administrateur sous Linux, remplacer uniquement `docker compose` par `sudo docker compose`. Les `&&` empêchent la suppression du dossier si l'arrêt Docker échoue. Ne pas poursuivre manuellement après une erreur.

**Windows — PowerShell 5.1 ou ultérieur :**

```powershell
Set-Location -LiteralPath .\social-link-converter -ErrorAction Stop
docker compose down --rmi all --volumes
if ($LASTEXITCODE -ne 0) { throw "Désinstallation Docker incomplète : le dossier est conservé." }
Set-Location .. -ErrorAction Stop
Remove-Item -LiteralPath .\social-link-converter -Recurse -Force -ErrorAction Stop
```

**Périmètre :** Docker lui-même, le dépôt sur GitHub, les autres projets Docker, les images de base partagées et le cache de construction Docker ne sont pas supprimés. Le cache peut conserver des couches de construction ; cette procédure désinstalle l'application, ce n'est pas un effacement sécurisé de toutes les traces sur le disque. Aucun `docker system prune` ni nettoyage global n'est exécuté, afin de ne pas toucher aux autres applications. Si le dossier du projet a été déplacé après le déploiement ou si `-p` a été utilisé, employer le même nom de projet Compose qu'à l'installation (`docker compose -p NOM_DU_PROJET down --rmi all --volumes`).

## Dépannage

| Symptôme | Vérification / solution |
| --- | --- |
| `docker` ou `git` introuvable | Installer les prérequis puis rouvrir le terminal ; voir le [guide](docs/docker-installation.md). |
| `Cannot connect to the Docker daemon` | Démarrer Docker Desktop, ou le service Docker sous Linux ; vérifier `docker info` et `docker context show`. |
| `permission denied` sur le socket Docker | Sous Linux, utiliser `sudo docker …` ou configurer explicitement les droits suivant le guide. Ne pas rendre le socket accessible à tous. |
| `docker: 'compose' is not a docker command` / option `--wait` inconnue | Installer ou mettre à jour le plugin Compose v2 / Docker Desktop. Utiliser `docker compose`, pas l'ancien `docker-compose`. |
| `port is already allocated` / `address already in use` | Choisir un autre `PORT` dans `.env`, puis relancer `up`. Ne pas arrêter un autre service à l'aveugle. |
| `Cannot assign requested address` | `BIND_ADDRESS` doit être une adresse de l'hôte ; essayer `127.0.0.1` pour le local ou `0.0.0.0` pour l'écoute réseau. |
| Page inaccessible depuis un autre appareil | Vérifier l'IP de l'hôte, le port, `BIND_ADDRESS`, le pare-feu et le VPN ; essayer d'abord sur l'hôte. Ne pas désactiver globalement le pare-feu. Voir les limites Docker/pare-feu du guide. |
| Navigateur en erreur SSL | Le service fournit du **HTTP** : utiliser `http://`, pas `https://`. Pour HTTPS, configurer séparément un reverse proxy et un certificat. |
| Bouton de copie sans effet, notamment par IP en HTTP | Le navigateur peut restreindre l'accès au presse-papiers. Sélectionner le lien de résultat puis copier manuellement (`Ctrl+C` / `Cmd+C`). |
| Conteneur `unhealthy` / attente échouée | Lire `docker compose logs --tail=100 link-converter` et le résultat de `docker inspect social_link_converter`. Ne pas considérer l'installation comme réussie tant que la page ne répond pas. |
| Échec du téléchargement de l'image | Vérifier Internet, DNS et les réglages de proxy Docker ; réessayer après correction. |
| L'aperçu Discord ne fonctionne pas | Tester le lien source et le service tiers ; des restrictions, pannes ou changements de plateforme peuvent empêcher l'aperçu. |

## Confidentialité et limites

La transformation des liens est **frontend-only** : elle s'effectue dans votre navigateur, sans API applicative de conversion ni base de données. Cela ne rend pas anonyme : le serveur HTTP peut journaliser les visites, et ouvrir ou partager un lien converti implique le service tiers, la plateforme et éventuellement Discord. Leurs règles de confidentialité et conditions d'utilisation s'appliquent. Supprimer les paramètres d'une URL n'est pas une garantie de suppression de tout suivi.

L'application ne télécharge pas les contenus pour les héberger elle-même et ne garantit pas le contournement des restrictions des plateformes. Éviter d'exposer directement ce serveur HTTP sur Internet ; privilégier un accès local ou un réseau privé maîtrisé.

## Développement et vérification automatique

Avec Node.js 24 installé, lancer `npm test` à la racine : aucun paquet npm à installer. Les tests couvrent les conversions, la validation des domaines, les options, la remise à zéro et les chemins de copie du presse-papiers.

[![Tests et Docker](https://github.com/julien84120/Social-Link-Converter/actions/workflows/ci.yml/badge.svg)](https://github.com/julien84120/Social-Link-Converter/actions/workflows/ci.yml)

GitHub Actions exécute les tests, construit l'image, démarre le service et vérifie sa santé, la page et le logo servis. Cette validation ne déploie pas l'application sur votre serveur. Les services tiers et les permissions réelles du presse-papiers ne sont pas testés par cette CI.

## Droits

**Tous droits réservés. Aucune licence n'a été sélectionnée pour ce projet.** La présence du code dans un dépôt public ne constitue pas une licence libre. Les composants et services tiers conservent leurs propres licences et conditions.
