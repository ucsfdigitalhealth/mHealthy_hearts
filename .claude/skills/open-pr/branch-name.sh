#!/usr/bin/env bash
# Compute a branch name for a Linear ticket, matching this repo's convention:
#   kpbala/<ticket-id>-<slugified-title>
# e.g. branch-name.sh "MHE-24" "Fix nutrition score not saving after reassessment"
#   -> kpbala/mhe-24-fix-nutrition-score-not-saving-after-reassessment
set -euo pipefail

ticket_id="${1:?usage: branch-name.sh <ticket-id> <title>}"
title="${2:?usage: branch-name.sh <ticket-id> <title>}"
prefix="kpbala"

id_slug=$(echo "$ticket_id" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]//g')
title_slug=$(echo "$title" | tr '[:upper:]' '[:lower:]' | sed "s/'//g" | sed 's/[^a-z0-9]/-/g' | sed 's/-\+/-/g; s/^-//; s/-$//')

branch="${prefix}/${id_slug}-${title_slug}"
if [ ${#branch} -gt 72 ]; then
  branch=$(echo "$branch" | cut -c1-72 | sed 's/-[^-]*$//')
fi
echo "$branch"
