import { ISearchResult } from "./search-result";

export interface IScraper {
    search(searchTerm: string, regex: string): Promise<ISearchResult | null>;
}