"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.elasticsearchService = void 0;
/**
 * Thin Elasticsearch client wrapper.
 * Only method signatures are provided here — implementation belongs to infra/bootstrap code.
 *
 * Controllers/services must call these methods; do NOT call ES client directly.
 */
const elasticsearch_1 = require("@elastic/elasticsearch");
const ES_NODE = process.env.ELASTICSEARCH_URL || process.env.ELASTICSEARCH_HOST || 'http://localhost:9200';
let esClient = null;
function getClient() {
    if (esClient)
        return esClient;
    esClient = new elasticsearch_1.Client({ node: ES_NODE });
    return esClient;
}
exports.elasticsearchService = {
    async search(params) {
        const client = getClient();
        const { index, query, from = 0, size = 10, sort } = params;
        // If caller passes a full body (including aggregations, highlight, etc.), use it.
        // Otherwise treat `query` as the `body.query`.
        const body = {};
        if (query && typeof query === 'object' && ('query' in query || 'bool' in query || 'multi_match' in query)) {
            body.query = query;
        }
        else if (query && typeof query === 'object') {
            // assume it's the `query` object
            body.query = query;
        }
        else {
            // pass through - for safety put as match_all
            body.query = { match_all: {} };
        }
        if (sort)
            body.sort = sort;
        const resp = await client.search({
            index,
            body,
            from,
            size
        });
        const took = resp.took ?? 0;
        const hitsRaw = (resp.hits && resp.hits.hits) || [];
        const totalRaw = resp.hits && resp.hits.total;
        const total = typeof totalRaw === 'object' && totalRaw !== null
            ? totalRaw.value
            : (totalRaw ?? hitsRaw.length);
        const hits = hitsRaw.map((h) => ({
            id: h._id,
            _source: h._source,
            _score: h._score
        }));
        return { took, total, hits };
    },
    async suggest(params) {
        const client = getClient();
        const { index, prefix, size = 10, context } = params;
        // Use completion suggester on `title.suggest` by default; callers should ensure index mapping exists.
        const suggestBody = {
            suggest: {
                completion_suggest: {
                    prefix,
                    completion: {
                        field: 'title.suggest',
                        size
                    }
                }
            },
            size: 0
        };
        // If context is provided, attach to completion suggester (ES expects contexts under `completion` query in mapping)
        if (context && Object.keys(context).length) {
            // Map provided context into suggestion contexts if appropriate
            // Note: This depends on index mapping having named contexts. We attach as `contexts` for the suggester.
            ;
            suggestBody.suggest.completion_suggest.completion.contexts = context;
        }
        const resp = await client.search({
            index,
            body: suggestBody
        });
        const suggestions = [];
        const suggestResult = resp.suggest && resp.suggest.completion_suggest;
        if (Array.isArray(suggestResult)) {
            for (const entry of suggestResult) {
                if (entry.options && Array.isArray(entry.options)) {
                    for (const opt of entry.options) {
                        suggestions.push({
                            text: opt.text,
                            payload: opt._source || opt._id,
                            score: opt.score
                        });
                    }
                }
            }
        }
        return { suggestions };
    },
    async getById(params) {
        const client = getClient();
        const { index, id } = params;
        try {
            const resp = await client.get({ index, id });
            return resp._source ?? null;
        }
        catch (e) {
            // Return null for not found
            if (e && e.meta && (e.meta.statusCode === 404 || e.statusCode === 404))
                return null;
            throw e;
        }
    },
    // Expose raw client for advanced operations (used by CLI)
    getClient() {
        return getClient();
    },
    async ping() {
        const client = getClient();
        try {
            await client.ping();
            return true;
        }
        catch {
            return false;
        }
    },
    async checkConnection() {
        return await this.ping();
    },
    async close() {
        if (esClient) {
            try {
                await esClient.close();
            }
            catch (e) {
                // ignore
            }
            finally {
                esClient = null;
            }
        }
    },
    getIndexName(name) {
        // Allow optional prefix via env var ES_INDEX_PREFIX
        const prefix = process.env.ES_INDEX_PREFIX || '';
        return `${prefix}${name}`;
    },
    async deleteIndex(name) {
        const client = getClient();
        const indexName = this.getIndexName(name);
        try {
            const exists = await client.indices.exists({ index: indexName });
            if (!exists)
                return false;
            await client.indices.delete({ index: indexName });
            return true;
        }
        catch (e) {
            return false;
        }
    },
    async initializeIndices() {
        const client = getClient();
        // Define basic mappings per SEARCH_MATCHING_PLAN.md
        const jobsIndex = this.getIndexName('jobs');
        const profilesIndex = this.getIndexName('profiles');
        const applicationsIndex = this.getIndexName('applications');
        // Jobs mapping
        const jobsMapping = {
            mappings: {
                properties: {
                    id: { type: 'keyword' },
                    title: {
                        type: 'text',
                        analyzer: 'standard',
                        fields: {
                            autocomplete: { type: 'text', analyzer: 'autocomplete_analyzer' },
                            suggest: { type: 'completion' }
                        }
                    },
                    description: { type: 'text', analyzer: 'standard' },
                    skills: { type: 'keyword' },
                    tags: { type: 'keyword' },
                    company_id: { type: 'keyword' },
                    company_name: { type: 'text' },
                    location_id: { type: 'keyword' },
                    location_name: { type: 'text' },
                    salary_range: { type: 'text' },
                    salary_min: { type: 'integer' },
                    salary_max: { type: 'integer' },
                    job_type: { type: 'keyword' },
                    experience_level: { type: 'integer' },
                    status: { type: 'keyword' },
                    posted_at: { type: 'date' },
                    expires_at: { type: 'date' },
                    metadata: { type: 'object' }
                }
            },
            settings: {
                analysis: {
                    analyzer: {
                        autocomplete_analyzer: {
                            type: 'custom',
                            tokenizer: 'standard',
                            filter: ['lowercase', 'asciifolding']
                        }
                    }
                }
            }
        };
        // Profiles mapping
        const profilesMapping = {
            mappings: {
                properties: {
                    id: { type: 'keyword' },
                    user_id: { type: 'keyword' },
                    full_name: { type: 'text', analyzer: 'standard' },
                    display_name: { type: 'text', analyzer: 'standard' },
                    headline: { type: 'text', analyzer: 'standard' },
                    bio: { type: 'text', analyzer: 'standard' },
                    desired_job_title: { type: 'text', analyzer: 'standard' },
                    desired_salary_min: { type: 'integer' },
                    desired_salary_max: { type: 'integer' },
                    years_of_experience: { type: 'integer' },
                    skills: { type: 'keyword' },
                    location_id: { type: 'keyword' },
                    location_text: { type: 'text' },
                    is_looking_for_job: { type: 'boolean' },
                    availability_status: { type: 'keyword' },
                    last_active_at: { type: 'date' },
                    resume_url: { type: 'keyword' },
                    avatar_url: { type: 'keyword' }
                }
            },
            settings: {
                analysis: {
                    analyzer: {
                        autocomplete_analyzer: {
                            type: 'custom',
                            tokenizer: 'standard',
                            filter: ['lowercase', 'asciifolding']
                        }
                    }
                }
            }
        };
        // Applications mapping
        const applicationsMapping = {
            mappings: {
                properties: {
                    id: { type: 'keyword' },
                    job_id: { type: 'keyword' },
                    profile_id: { type: 'keyword' },
                    user_id: { type: 'keyword' },
                    status: { type: 'keyword' },
                    applied_at: { type: 'date' },
                    first_viewed_at: { type: 'date' },
                    last_viewed_at: { type: 'date' },
                    view_count: { type: 'integer' },
                    // Candidate info
                    candidate_name: { type: 'text', analyzer: 'standard' },
                    candidate_email: { type: 'keyword' },
                    candidate_headline: { type: 'text', analyzer: 'standard' },
                    candidate_location: { type: 'text', analyzer: 'standard' },
                    candidate_years_experience: { type: 'integer' },
                    candidate_desired_salary_min: { type: 'integer' },
                    candidate_desired_salary_max: { type: 'integer' },
                    candidate_skills: { type: 'keyword' },
                    candidate_education: { type: 'keyword' },
                    // Job info
                    job_title: { type: 'text', analyzer: 'standard' },
                    job_company_name: { type: 'text', analyzer: 'standard' },
                    job_location: { type: 'text', analyzer: 'standard' },
                    job_type: { type: 'keyword' },
                    job_salary_min: { type: 'integer' },
                    job_salary_max: { type: 'integer' },
                    // Application stages
                    current_stage_name: { type: 'keyword' },
                    current_stage_status: { type: 'keyword' },
                    stages_count: { type: 'integer' },
                    completed_stages_count: { type: 'integer' },
                    average_rating: { type: 'float' },
                    // Metadata
                    has_notes: { type: 'boolean' },
                    has_rating: { type: 'boolean' },
                    is_shortlisted: { type: 'boolean' }
                }
            },
            settings: {
                analysis: {
                    analyzer: {
                        autocomplete_analyzer: {
                            type: 'custom',
                            tokenizer: 'standard',
                            filter: ['lowercase', 'asciifolding']
                        }
                    }
                }
            }
        };
        // Create or update indices
        const createIfNotExists = async (indexName, body) => {
            const exists = await client.indices.exists({ index: indexName });
            if (!exists) {
                await client.indices.create({ index: indexName, body });
            }
            else {
                // Optionally update mapping - skip for now to avoid breaking changes
            }
        };
        await createIfNotExists(jobsIndex, jobsMapping);
        await createIfNotExists(profilesIndex, profilesMapping);
        await createIfNotExists(applicationsIndex, applicationsMapping);
    }
};
