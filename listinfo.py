#!/usr/bin/python3

import sys
import os
import subprocess

name = sys.argv[1]
result = subprocess.run(['qy', 'glin', name], stdout=subprocess.PIPE, stderr=subprocess.PIPE)

stderr = result.stderr.decode('utf-8')

if 'No records in database match' in stderr:
	print(f"List {name} doesn't exist.")
elif 'Insufficient permission' in stderr:
	print(f"List {name} is hidden, so there's no more info available.")
else:
	stdout = result.stdout.decode('utf-8')
	properties = {}
	for line in stdout.split('\n'):
		x = line.split(': ')
		if (len(x) < 2):
			continue
		key = x[0]
		value = x[1].strip()
		properties[key] = value
	info = f"The description of {'active' if bool(int(properties['active'])) else '**INACTIVE**'} {'mailing' if bool(int(properties['maillist'])) else 'non-mailing'} list **{properties['name']}** is **\"{properties['description']}\"**. It is owned by {properties['ace_type'].lower()} **{properties['ace_name']}**. It is {'**public**, meaning anyone can add themselves to it' if bool(int(properties['publicflg'])) else '**private**, meaning only the owner can add people to it'}. It was last modified by {properties['modby']} on {properties['modtime']}."
	print(info)	

