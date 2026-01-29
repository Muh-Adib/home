<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateArticleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Auth handled in controller via policy
    }

    public function rules(): array
    {
        return [
            'title' => 'required|string|max:255',
            'content' => 'required|string',
            'excerpt' => 'nullable|string|max:500',
            'meta_title' => 'nullable|string|max:60',
            'meta_description' => 'nullable|string|max:160',
            'seo_keywords' => 'nullable|array',
            'target_keywords' => 'nullable|array',
            'language' => 'required|in:' . implode(',', config('article.languages.supported')),
            'status' => 'required|in:draft,scheduled,published,archived',
            'scheduled_at' => 'nullable|date|after:now|required_if:status,scheduled',
            'featured_image' => 'nullable|string',
            'property_ids' => 'nullable|array',
            'property_ids.*' => 'exists:properties,id',
            'outline' => 'nullable|string',
        ];
    }
}
