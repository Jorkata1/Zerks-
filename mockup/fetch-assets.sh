#!/usr/bin/env bash
# Downloads the free (CC0) assets the scene uses, so the repo itself stays small.
#   models/  Kenney Space Kit (kenney.nl), from its npm mirror
#   ph/      Poly Haven textures and sky (polyhaven.com)
# Needs network access to registry.npmjs.org, api.polyhaven.com and dl.polyhaven.org.
set -euo pipefail
cd "$(dirname "$0")"

# Kenney Space Kit: only the models the scene loads
KIT="hangar_largeA hangar_roundB hangar_roundGlass satelliteDish_large satelliteDish_detailed machine_generatorLarge machine_barrelLarge machine_wireless rover astronautA rocket_fuelA rocket_sidesA rocket_finsA rocket_topA craterLarge rocks_smallA rocks_smallB rock_largeA rock_largeB rock_crystals rock_crystalsLargeA rock_crystalsLargeB craft_speederA craft_speederB craft_cargoA barrels pipe_straight"
if [ ! -f models/rover.glb ]; then
  tmp=$(mktemp -d)
  (cd "$tmp" && npm pack @anabis/kenney-space-kit-mirror@2.0.0 --silent >/dev/null && tar xzf anabis-kenney-space-kit-mirror-2.0.0.tgz)
  mkdir -p models
  for n in $KIT; do cp "$tmp/package/assets/Models/GLTF format/$n.glb" models/; done
  cp "$tmp/package/assets/License.txt" models/Kenney-License.txt
  rm -rf "$tmp"
  echo "models: $(ls models/*.glb | wc -l) Kenney models"
fi

# the smooth CellCog models kept in the repo (art/3d)
mkdir -p models
cp ../art/3d/*.glb models/
# the round buildings of chapter 1 (Draco-compressed), used by map.html#kk20 and the other #kk states
mkdir -p models/kk
cp ../art/3d/buildings/*.glb models/kk/

# Poly Haven: colour, normal and roughness maps, plus one sky
UA='Mozilla/5.0'
mkdir -p ph
for pair in red_laterite_soil_stones:2k aerial_grass_rock:2k hangar_concrete_floor:1k aerial_asphalt_01:1k sandy_gravel_02:1k metal_plate:1k; do
  name=${pair%%:*}; res=${pair##*:}
  [ -f "ph/${name}_diff.jpg" ] && continue
  json=$(curl -s --max-time 30 -A "$UA" "https://api.polyhaven.com/files/$name")
  for kv in Diffuse:diff nor_gl:nor Rough:rough; do
    key=${kv%%:*}; short=${kv##*:}
    url=$(printf '%s' "$json" | python3 -c "import json,sys; print(json.load(sys.stdin)['$key']['$res']['jpg']['url'])")
    curl -s --max-time 120 -A "$UA" -o "ph/${name}_${short}.jpg" "$url"
  done
  echo "ph: $name"
done
sky=kloofendal_48d_partly_cloudy_puresky
if [ ! -f "ph/${sky}_1k.hdr" ]; then
  url=$(curl -s --max-time 30 -A "$UA" "https://api.polyhaven.com/files/$sky" | python3 -c "import json,sys; print(json.load(sys.stdin)['hdri']['1k']['hdr']['url'])")
  curl -s --max-time 120 -A "$UA" -o "ph/${sky}_1k.hdr" "$url"
  echo "ph: $sky"
fi
