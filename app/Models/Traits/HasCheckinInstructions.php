<?php

declare(strict_types=1);

namespace App\Models\Traits;

use App\Models\Property;

/**
 * Checkin Instructions Trait for Booking Model
 *
 * Handles check-in instruction generation and formatting
 */
trait HasCheckinInstructions
{
    /**
     * Get check-in instructions for this booking.
     * Flow: custom booking instruction > property template > default template
     */
    public function getCheckinInstructions(): array
    {
        $property = $this->property;

        // Step 1: Check if booking has custom checkin_instruction
        if (! empty($this->checkin_instruction)) {
            $instructions = is_array($this->checkin_instruction)
                ? $this->checkin_instruction
                : ['custom' => $this->checkin_instruction];
        }
        // Step 2: Use property template if exists
        elseif (! empty($property->checkin_instructions) && is_array($property->checkin_instructions)) {
            $instructions = $property->checkin_instructions;
        }
        // Step 3: Fallback to default template
        else {
            $instructions = Property::getDefaultCheckinInstructionsTemplate();
        }

        // Replace placeholders with actual data
        $keyboxCode = $property->current_keybox_code ?? 'N/A';
        $propertyName = $property->name ?? 'Property';
        $propertyAddress = $property->address ?? '';

        return $this->replaceInstructionPlaceholders($instructions, [
            'keybox_code' => $keyboxCode,
            'property_name' => $propertyName,
            'address' => $propertyAddress,
        ]);
    }

    /**
     * Replace placeholders in instructions array/string
     */
    private function replaceInstructionPlaceholders($instructions, array $replacements): array
    {
        if (is_string($instructions)) {
            return str_replace(
                array_map(fn ($key) => '{{'.$key.'}}', array_keys($replacements)),
                array_values($replacements),
                $instructions
            );
        }

        if (! is_array($instructions)) {
            return [];
        }

        $result = [];
        foreach ($instructions as $key => $value) {
            if (is_string($value)) {
                $result[$key] = str_replace(
                    array_map(fn ($k) => '{{'.$k.'}}', array_keys($replacements)),
                    array_values($replacements),
                    $value
                );
            } elseif (is_array($value)) {
                $result[$key] = $this->replaceInstructionPlaceholders($value, $replacements);
            } else {
                $result[$key] = $value;
            }
        }

        return $result;
    }

    /**
     * Get formatted check-in instructions as string (for display)
     */
    public function getFormattedCheckinInstructions(): string
    {
        $instructions = $this->getCheckinInstructions();

        if (empty($instructions)) {
            return '';
        }

        $formatted = [];

        // Handle array format
        if (isset($instructions['welcome'])) {
            if (! empty($instructions['welcome'])) {
                $formatted[] = $instructions['welcome'];
            }
            if (! empty($instructions['keybox_location'])) {
                $formatted[] = $instructions['keybox_location'];
            }
            if (! empty($instructions['keybox_code'])) {
                $formatted[] = $instructions['keybox_code'];
            }
            if (! empty($instructions['checkin_time'])) {
                $formatted[] = $instructions['checkin_time'];
            }
            if (! empty($instructions['emergency_contact'])) {
                $formatted[] = $instructions['emergency_contact'];
            }
            if (! empty($instructions['additional_info']) && is_array($instructions['additional_info'])) {
                $formatted[] = "\n".implode("\n", array_map(fn ($info) => '• '.$info, $instructions['additional_info']));
            }
        }
        // Handle simple array or custom format
        else {
            foreach ($instructions as $key => $value) {
                if (is_string($value)) {
                    $formatted[] = $value;
                } elseif (is_array($value)) {
                    $formatted[] = implode("\n", array_map(fn ($v) => '• '.$v, $value));
                }
            }
        }

        return implode("\n\n", array_filter($formatted));
    }
}
