# Silver Screen Backend

FastAPI server that loads the trained ML artifacts from the Jupyter notebook
and serves TF-IDF cosine similarity + K-Means cluster recommendations.

---

## Setup

### 1 — Generate the artifacts first

Open and run `CapstoneFinal_MovieLens.ipynb` end-to-end in Google Colab or
Jupyter. The notebook will create an `artifacts/` folder containing:

```
artifacts/
├── tfidf_vectorizer.pkl
├── tfidf_matrix.npz
├── cosine_topk_index.json
├── kmeans.pkl
├── scaler.pkl
├── movies_metadata.parquet
├── movie_ml.parquet
├── title_to_index.json
└── index_to_movie_id.json
```

Copy (or symlink) this `artifacts/` folder into the `backend/` directory:

```bash
cp -r /path/to/artifacts  silver-screen/backend/artifacts
```

### 2 — Install Python dependencies

```bash
cd silver-screen/backend
pip install -r requirements.txt
```

### 3 — Start the server

```bash
uvicorn main:app --reload --port 8000
```

The server loads all artifacts on startup (~2–5 seconds), then logs:

```
✅ Ready — 87,461 movies | 42,830 vocab terms | 7 clusters
```

Open http://localhost:8000/docs for the interactive API explorer.

---

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Server status and model info |
| GET | `/search?q=inception` | Title search |
| GET | `/movie/{id}` | Full movie metadata |
| GET | `/similar/{id}` | TF-IDF cosine neighbours |
| GET | `/cluster/{id}` | K-Means cluster feed |
| GET | `/clusters` | Summary of all clusters |
| POST | `/similar-text` | Similarity from free-text description |

---

## How the models work

### TF-IDF + Cosine Similarity (`/similar/{id}`)

Each movie is represented as a sparse vector built from its **soup text** —
a concatenation of:
- Genres (e.g. `action crime drama`)
- Keywords (e.g. `superhero gotham joker vigilante`)
- Top 5 cast members
- Director name
- Cleaned overview text

TF-IDF (Term Frequency–Inverse Document Frequency) weights rare terms higher
than common ones — so "superhero" appearing in 200 movies is less informative
than "gotham" appearing in 3.

During training, the notebook pre-computed cosine similarities between all
87k movie vectors and stored the top-100 neighbours per movie in
`cosine_topk_index.json`. The `/similar` endpoint does a single dict lookup
— zero computation at serving time.

### K-Means Clustering (`/cluster/{id}`)

K-Means groups movies into N clusters using a **combined feature matrix**:

```
X = [TF-IDF vector | scaled(avg_rating, rating_count, year)]
```

Movies in the same cluster share similar content profiles AND similar audience
metrics. The **silhouette score** for each movie measures how tightly it fits
its own cluster vs the nearest neighbouring cluster:
- Score close to +1 → the movie is a strong representative of its cluster
- Score near 0 → the movie sits on the border between two clusters
- Score < 0 → the movie may have been assigned to the wrong cluster

`/cluster/{id}` returns same-cluster peers sorted by silhouette — the most
archetypal members of the genre/era neighbourhood first.

---

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ARTIFACTS_DIR` | `artifacts` | Path to the artifacts folder |

```bash
ARTIFACTS_DIR=/path/to/artifacts uvicorn main:app --port 8000
```
