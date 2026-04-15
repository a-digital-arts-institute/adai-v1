#!/usr/bin/env bash
# Integration tests for A(DAI) server
# Usage: ./test.sh [--no-seed]
#   --no-seed  Skip DB recreation (use existing adai.db)

set -euo pipefail

PORT=8099
BASE="http://localhost:$PORT"
PASS=0
FAIL=0
SERVER_PID=""

cleanup() {
  if [ -n "$SERVER_PID" ]; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

# --- helpers ---

check() {
  local name="$1" url="$2" expected_code="$3"
  shift 3
  local keys=("$@")
  resp=$(curl -s -w "\n%{http_code}" "$url")
  code=$(echo "$resp" | tail -1)
  body=$(echo "$resp" | sed '$d')

  if [ "$code" != "$expected_code" ]; then
    echo "FAIL [$name] expected status $expected_code, got $code"
    FAIL=$((FAIL+1))
    return
  fi
  if ! echo "$body" | python3 -m json.tool > /dev/null 2>&1; then
    echo "FAIL [$name] invalid JSON"
    FAIL=$((FAIL+1))
    return
  fi
  for key in "${keys[@]}"; do
    if ! echo "$body" | python3 -c "import sys,json; d=json.load(sys.stdin); assert '$key' in d" 2>/dev/null; then
      echo "FAIL [$name] missing key: $key"
      FAIL=$((FAIL+1))
      return
    fi
  done
  echo "PASS [$name]"
  PASS=$((PASS+1))
}

check_html() {
  local name="$1" url="$2" expected_code="$3"
  code=$(curl -s -o /dev/null -w "%{http_code}" "$url")
  if [ "$code" != "$expected_code" ]; then
    echo "FAIL [$name] expected $expected_code, got $code"
    FAIL=$((FAIL+1))
  else
    echo "PASS [$name]"
    PASS=$((PASS+1))
  fi
}

pycheck() {
  local name="$1" url="$2" script="$3"
  if curl -s "$url" | python3 -c "$script" 2>/dev/null; then
    echo "PASS [$name]"
    PASS=$((PASS+1))
  else
    echo "FAIL [$name]"
    FAIL=$((FAIL+1))
  fi
}

# --- setup ---

SEED=true
if [ "${1:-}" = "--no-seed" ]; then
  SEED=false
fi

if $SEED; then
  echo "Seeding database..."
  rm -f adai.db adai.db-shm adai.db-wal
  shards seed.shs > /dev/null 2>&1
fi

echo "Starting server on port $PORT..."
shards run.shs "http-port:$PORT" > /dev/null 2>&1 &
SERVER_PID=$!

# wait for server to be ready
for i in $(seq 1 30); do
  if curl -s -o /dev/null "$BASE/" 2>/dev/null; then
    break
  fi
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    echo "ERROR: server exited unexpectedly"
    exit 1
  fi
  sleep 0.5
done

if ! curl -s -o /dev/null "$BASE/" 2>/dev/null; then
  echo "ERROR: server did not start within 15s"
  exit 1
fi

echo ""

# --- JSON API ---

echo "=== JSON API ==="
check "GET /api/stats" "$BASE/api/stats" 200 total_nodes total_edges total_signals pending_reviews
check "GET /api/graph" "$BASE/api/graph" 200 nodes edges
check "GET /api/graph?type=artist" "$BASE/api/graph?type=artist" 200 nodes edges
check "GET /api/graph?type=_all" "$BASE/api/graph?type=_all" 200 nodes edges
check "GET /api/graph/:slug" "$BASE/api/graph/ars-electronica" 200 nodes edges
check "GET /practitioner/:slug/data" "$BASE/practitioner/tabita-rezaire/data" 200 node edges signals
check "GET /practitioner/:slug/data 404" "$BASE/practitioner/nonexistent-slug-xyz/data" 404 error
check "GET /api/graph/:slug 404" "$BASE/api/graph/nonexistent-slug-xyz" 404 error

# --- JSON structure ---

echo ""
echo "=== JSON structure ==="

pycheck "stats values are integers" "$BASE/api/stats" \
  "import sys,json; d=json.load(sys.stdin); assert all(isinstance(v,int) for v in d.values())"

pycheck "stats has expected counts" "$BASE/api/stats" \
  "import sys,json; d=json.load(sys.stdin); assert d['total_nodes']>0 and d['total_edges']>0"

pycheck "graph node structure" "$BASE/api/graph" \
  "import sys,json; d=json.load(sys.stdin)
assert len(d['nodes'])>0
for k in ['id','name','type','slug']:
    assert k in d['nodes'][0], f'node missing {k}'"

pycheck "graph edge structure" "$BASE/api/graph" \
  "import sys,json; d=json.load(sys.stdin)
assert len(d['edges'])>0
for k in ['source','target','type','confidence']:
    assert k in d['edges'][0], f'edge missing {k}'"

pycheck "graph type filter reduces nodes" "$BASE/api/graph" \
  "import sys,json,urllib.request
all_data=json.load(sys.stdin)
filtered=json.load(urllib.request.urlopen('$BASE/api/graph?type=artist'))
assert len(filtered['nodes'])<len(all_data['nodes'])"

pycheck "ego graph has exactly one center node" "$BASE/api/graph/ars-electronica" \
  "import sys,json; d=json.load(sys.stdin)
centers=[n for n in d['nodes'] if n.get('center')]
assert len(centers)==1"

pycheck "ego graph edges reference center node" "$BASE/api/graph/ars-electronica" \
  "import sys,json; d=json.load(sys.stdin)
center_id=[n['id'] for n in d['nodes'] if n.get('center')][0]
for e in d['edges']:
    assert e['source']==center_id or e['target']==center_id, f'edge not connected to center: {e}'"

pycheck "practitioner data has nested metadata" "$BASE/practitioner/tabita-rezaire/data" \
  "import sys,json; d=json.load(sys.stdin)
assert isinstance(d['node']['metadata'],dict)
assert 'basic_info' in d['node']['metadata']"

pycheck "practitioner data node fields" "$BASE/practitioner/tabita-rezaire/data" \
  "import sys,json; d=json.load(sys.stdin)
for k in ['id','name','type','slug','created_at','updated_by','metadata']:
    assert k in d['node'], f'node missing {k}'"

pycheck "node without metadata gets empty object" "$BASE/practitioner/ars-electronica/data" \
  "import sys,json; d=json.load(sys.stdin)
assert isinstance(d['node']['metadata'],dict) and len(d['node']['metadata'])==0"

# --- HTML pages ---

echo ""
echo "=== HTML pages ==="
check_html "GET /" "$BASE/" 200
check_html "GET /explore" "$BASE/explore" 200
check_html "GET /graph" "$BASE/graph" 200
check_html "GET /practitioner/:slug" "$BASE/practitioner/tabita-rezaire" 200
check_html "GET /contribute" "$BASE/contribute" 200
check_html "GET /review" "$BASE/review" 200
check_html "GET /practitioner/not-found" "$BASE/practitioner/nonexistent-xyz" 404

# --- results ---

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
