#!/bin/bash

# Fix file casing inconsistencies by removing duplicate PascalCase files
# The canonical files are kebab-case versions

echo "Removing duplicate PascalCase files from accordion directory..."
rm -f "/home/chanway/Projects/SvelteHR/src/lib/components/ui/accordion/Accordion.svelte"
rm -f "/home/chanway/Projects/SvelteHR/src/lib/components/ui/accordion/AccordionContent.svelte"
rm -f "/home/chanway/Projects/SvelteHR/src/lib/components/ui/accordion/AccordionItem.svelte"
rm -f "/home/chanway/Projects/SvelteHR/src/lib/components/ui/accordion/AccordionTrigger.svelte"

echo "Removing duplicate PascalCase files from radio-group directory..."
rm -f "/home/chanway/Projects/SvelteHR/src/lib/components/ui/radio-group/RadioGroup.svelte"
rm -f "/home/chanway/Projects/SvelteHR/src/lib/components/ui/radio-group/RadioGroupItem.svelte"

echo "Done! Duplicate files removed."
echo ""
echo "Files removed:"
echo "  - accordion/Accordion.svelte"
echo "  - accordion/AccordionContent.svelte"
echo "  - accordion/AccordionItem.svelte"
echo "  - accordion/AccordionTrigger.svelte"
echo "  - radio-group/RadioGroup.svelte"
echo "  - radio-group/RadioGroupItem.svelte"
echo ""
echo "Canonical kebab-case files remain:"
echo "  - accordion/accordion.svelte"
echo "  - accordion/accordion-content.svelte"
echo "  - accordion/accordion-item.svelte"
echo "  - accordion/accordion-trigger.svelte"
echo "  - radio-group/radio-group.svelte"
echo "  - radio-group/radio-group-item.svelte"
