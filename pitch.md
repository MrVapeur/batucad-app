# Brief projet : application de partitions de batucada

## 1. Objectif

Application web front-end, sans backend, qui affiche des partitions de batucada (percussions brésiliennes) pour un groupe. Chaque musicien consulte **la partie de son instrument** pour un morceau donné.

Usage principal : **en répétition**, sur téléphone, dans un lieu où le réseau peut être mauvais ou absent. L'application doit donc fonctionner **hors ligne** et se lire facilement sur petit écran, en portrait comme en paysage.

## 2. Contraintes

- **Hébergement** : site statique sur GitHub Pages (servi sous un sous-chemin `/nom-du-repo/`, HTTPS fourni). Pas de serveur, pas d'API.
- **Hors ligne** : l'ensemble des données et du code est précaché au premier chargement (PWA installable avec service worker).
- **Mobile-first** : écran d'environ 360 px de large en portrait comme cas de référence, avec un mode paysage pris en charge.
- **Orientation non verrouillée** : ne pas définir le champ `orientation` dans le manifest de la PWA, afin de laisser l'écran pivoter.
- **Routing compatible GitHub Pages** : privilégier un routage par hash (`#/...`) pour éviter les 404 au rafraîchissement.
- **Volume** : environ 10 morceaux actifs × 7 instruments. Quelques dizaines de Ko de JSON au total. Aucun besoin de lazy loading ni de stratégie de cache sophistiquée : tout est précaché.
- **Pas d'audio** pour le moment. Ne pas l'intégrer à l'architecture. S'il arrive plus tard, il devra être traité à part (cache à la demande, pas de précache).

## 3. Vocabulaire

- **Morceau** : une pièce du répertoire (ex. Samba reggae).
- **Élément** : une unité jouable d'un morceau, soit un _motif_ (ex. « Motif 1 »), soit un _break_ (ex. « Break 2 »). Les noms sont libres et ne suivent aucune convention, donc ne rien en déduire.
- **Instrument** (7) : Surdo 1, Surdo 2, Dobra, Caixa, Timbal, Repinique, Torpedo.
- **Partie** : ce que joue un instrument dans un élément, exprimé comme une chaîne rythmique.
- **Pas** : une subdivision de la mesure, représentée par un caractère de la chaîne.
- **Temps** : un groupe de pas. Par défaut, 1 temps = 4 pas.
- **Clave** : court rythme utilisé ponctuellement. Les claves servent à tout le groupe à comprendre le fonctionnement de la musique et à improviser. Dans le modèle de données, ce sont des entités **autonomes** : aucun lien avec les morceaux, motifs ou instruments.

## 4. Modèle de données (JSON statique)

### Arborescence

```
data/
├── instruments.json      # légende des symboles, par instrument
├── claves.json           # liste autonome de claves
└── morceaux/
    ├── samba-reggae.json  # un fichier par morceau
    └── ...
```

### `instruments.json`

Définit les 7 instruments et la signification des symboles qui les concernent.

```json
{
  "timbal": {
    "nom": "timbal",
    "symboles": { "X": "frappe ouverte", "o": "frappe étouffée", ".": "silence" }
  },
  "caixa": {
    "nom": "Caixa",
    "symboles": { "X": "accent", "x": "normal", "o": "ghost note", ".": "silence" }
  }
}
```

Les identifiants attendus sont : `surdo1`, `surdo2`, `martel`, `dobra`, `caixa`, `timbal`, `repinique`, `torpedo`. Les symboles ci-dessus sont des exemples : la légende réelle reste à définir par instrument.

### `morceaux/<id>.json`


```json
{
  "id": "samba-reggae",
  "titre": "Samba reggae",
  "tempo": 90,
  "elements": [
    {
      "id": "motif-1",
      "nom": "Motif 1",
      "parties": {
        "surdo1": "X...X...X...X...",
        "caixa": "xxXxxxXxxxXxxxXx"
      }
    },
    {
      "id": "break-2",
      "nom": "Break 2",
      "parties": { "surdo1": "XX.......XXX...." }
    }
  ]
}
```

Règles du modèle :

- **Un caractère = un pas.** La longueur d'une chaîne est donc le nombre de pas de la partie. Aujourd'hui, toutes les chaînes font **16 pas** (une mesure de 4 temps × 4 pas) ou **32 pas** (deux fois 16).
- **Le code ne doit jamais coder en dur 16 ou 32.** Le nombre de lignes, de temps et de pas se déduit de la longueur de la chaîne et de `pasParTemps` (voir ci-dessous). Ces valeurs peuvent évoluer.
- **`pasParTemps` (optionnel, entier, défaut 4)** : nombre de pas par temps, défini au niveau du morceau. Il n'est pas utilisé aujourd'hui (aucun morceau ternaire ou irrégulier), mais il est prévu pour accueillir plus tard des morceaux ternaires (`pasParTemps: 3`) ou d'autres découpages sans changer le format.
- `id` est un slug technique stable ; `nom` est le libellé affiché. **L'ordre d'affichage est l'ordre du tableau `elements`.**
- Le nombre d'éléments varie d'un morceau à l'autre. La structure générale est similaire entre morceaux, mais rien n'est garanti.
- Un instrument **absent** de `parties` signifie qu'il ne joue pas dans cet élément.
- `tempo` est informatif (pas d'audio).
- Un champ optionnel `type` (`motif` / `break`) peut exister, à conserver uniquement si l'interface distingue visuellement les deux.

### `claves.json`

```json
[
  { "id": "clave-son", "nom": "Clave Son", "pattern": "X..X..X...X.X..." }
]
```

Liste plate, sans référence croisée. Les symboles des claves ne dépendent d'aucun instrument (légende générique à définir).

## 5. Navigation

Routage par hash. Écrans :

|Écran|Route (proposition)|Contenu|
|---|---|---|
|Liste des morceaux|`#/`|Tous les morceaux, point d'entrée|
|Morceau|`#/morceaux/<id>/<instrument>`|Éléments du morceau pour l'instrument choisi|
|Claves|`#/claves`|Liste des claves|

- L'instrument est dans l'URL, ce qui permet de partager un lien direct vers une partie.
- Le dernier instrument choisi est mémorisé (stockage local du navigateur) et sert à **préremplir** l'instrument à l'ouverture d'un morceau sans instrument dans l'URL. Un musicien joue toujours le même instrument et ne doit pas avoir à le re-sélectionner à chaque morceau.
- Le mode d'affichage choisi manuellement (voir section 6) est également mémorisé dans le stockage local.

## 6. Interface

### Écran d'un morceau

- **Un seul instrument affiché à la fois**, choisi par un **menu déroulant natif** (`<select>`), pas de dropdown personnalisé ni d'onglets (7 onglets ne tiennent pas sur écran étroit).
- Le sélecteur est dans un **header fixe (sticky)**, pour ne pas remonter en haut de page à chaque changement d'instrument. En mode horizontal, ce header est **compact** (sélecteur et titre sur une seule ligne, environ 40 px), car la hauteur est la ressource rare en paysage (un téléphone fait environ 390 px de haut).
- Les éléments (motifs, breaks) sont **empilés verticalement**, dans l'ordre du tableau, avec uniquement la partie de l'instrument sélectionné.
- Sous le sélecteur : la **légende des symboles limitée à l'instrument choisi** (elle diffère d'un instrument à l'autre).
- **Instrument absent d'un élément** : afficher l'élément **grisé avec la mention « ne joue pas »** plutôt que le masquer. En répétition, savoir qu'on se tait sur un break est une information utile, et masquer donnerait l'impression qu'il manque quelque chose.

### Rendu d'une partie : deux modes

Notations : `pas` = longueur de la chaîne, `T` = `pasParTemps` (4 par défaut).

**Mode vertical (portrait)**

- **Une ligne = un temps** : `T` cases par ligne (4 par défaut).
- Nombre de lignes = `pas / T` : **4 lignes pour 16 pas, 8 lignes pour 32 pas**.
- Le **numéro du temps** est affiché en début de ligne (colonne étroite à gauche). C'est le repère du musicien (« j'entre au 3 »).
- Pas de trait long : chaque ligne commence sur un temps, la ligne est elle-même le marqueur.
- Les temps sont distingués par un **fond alterné une ligne sur deux**.
- Lignes basses (environ 35 à 40 px) : les cellules sont des rectangles larges, pas des carrés. Sur un écran de 360 px, une cellule fait environ 80 px de large, ce qui est très lisible.

**Mode horizontal (paysage)**

- **Une ligne = 4 temps** : `4 × T` cases par ligne (**16 par défaut**).
- Nombre de lignes = `pas / (4 × T)` : **1 ligne pour 16 pas, 2 lignes pour 32 pas**.
- Les temps sont distingués par un **fond alterné par groupe de `T` cases**, complété par un **trait vertical plus épais au début de chaque temps**.
- Le numéro du temps est affiché au-dessus de chaque groupe.

**Règles communes**

- Une dernière ligne incomplète (longueur qui n'est pas un multiple de la ligne) garde **la même largeur de cellule**, alignée à gauche, pour que les éléments restent comparables entre eux.
- Les **aplats alternés sont le repère principal des temps**, les traits fins ne sont qu'un renfort : à bout de bras et en lumière faible, un trait de 1 px disparaît, pas un aplat (convention des step sequencers, qui groupent les pas par 4 avec des couleurs alternées).
- Chaque symbole a un rendu visuel distinct (ex. `X` gras, `x` normal, `o` petit et atténué, `.` point discret).
- Une case ne dépend que de son symbole et de son index (pour un éventuel surlignage futur).

### Choix du mode d'affichage

- **Bascule automatique sur la largeur disponible**, pas sur l'orientation ni sur les capteurs de mouvement du téléphone : le mode horizontal s'active quand une ligne complète de `4 × T` cases tient à l'écran (environ 450 px minimum pour 16 cases). Une tablette en portrait peut donc passer en horizontal. Réalisable en CSS pur (container query ou breakpoint de largeur), sans JavaScript ni accéléromètre.
- **Bouton de bascule vertical / horizontal**, en surcharge manuelle : nécessaire car beaucoup d'utilisateurs verrouillent la rotation de l'écran, auquel cas l'écran ne pivote jamais. Tant que l'utilisateur n'a pas appuyé, le mode est automatique. Une fois qu'il a choisi, son choix est **mémorisé** (stockage local) et prime sur l'automatique.

### Écran des claves

Liste simple des claves, chacune affichée avec le même rendu de grille (mêmes deux modes).

## 7. Évolutions envisagées (hors périmètre initial)

- Surlignage de la mesure ou du pas en cours, ajustement du tempo d'affichage.
- Morceaux ternaires ou à découpage irrégulier (déjà prévu par `pasParTemps`).
- Audio (à traiter à part, voir contraintes).
- Validation des partitions (script à lancer au build ou en CI) :
  - Les erreurs de saisie manuelle seraient silencieuses à l'exécution, donc un script vérifie :
    1. Chaque instrument cité dans `parties` existe dans `instruments.json`.
    2. Toutes les parties d'un même élément ont la même longueur (sinon l'affichage est décalé).
    3. Les caractères utilisés appartiennent à la légende de l'instrument concerné.
    4. Les `id` sont uniques (éléments d'un morceau, claves).

## 8. Décisions actées

- Format de partition : grilles rythmiques en chaînes de caractères, un fichier JSON par morceau.
- Longueurs actuelles : 16 ou 32 pas (2 × 16), base 4 pas par temps ; format extensible via `pasParTemps` sans changement de structure.
- Deux modes de rendu (vertical : une ligne = un temps ; horizontal : une ligne = 4 temps), avec repérage des temps par aplats alternés et numéros de temps.
- Bascule automatique sur la largeur, plus bouton de surcharge manuelle mémorisé.
- Header compact en paysage.
- Un instrument affiché à la fois, sélecteur natif, instrument dans l'URL et mémorisé.

## 9. Hypothèses et points non tranchés

À valider ou à corriger avant implémentation :

1. **Format des partitions** : le modèle suppose des grilles rythmiques en chaînes de caractères. Il n'a pas été confronté à un vrai fichier JSON existant : si les partitions actuelles ont une autre forme, le modèle doit être adapté.
2. **Numérotation des temps sur 32 pas** : continue (1 à 8) ou qui repart à 1 à chaque mesure de 16 pas (1 à 4, puis 1 à 4). Non tranché.
3. **Information non portée par le format** : le sticking (main droite/gauche) et les ornements (flam, roulement) ne sont pas représentables avec un caractère par coup. À traiter si nécessaire.
4. **Légende des symboles** : à définir concrètement pour chacun des 7 instruments et pour les claves.
5. **Champ `type`** (motif/break) : à garder ou supprimer selon que l'interface les distingue.
6. **Retour au mode automatique** : une fois le mode choisi manuellement, comment revenir à l'automatique (option dédiée, appui long, etc.). Non tranché.
7. **Header en paysage** : compact (retenu) ; un masquage au scroll reste une variante possible.
8. **Noms de routes** : proposés ci-dessus, modifiables.
