import { useCallback, useState } from "react";

/**
 * Search / "Xem tất cả" state of "Video của tôi". Created once by the page and handed to both the
 * desktop and the mobile section so they share it (Studychill kept this state on the page).
 */
export interface MyVideosControls {
  searchOpen: boolean;
  query: string;
  setQuery: (value: string) => void;
  clearQuery: () => void;
  /** Opens the sliding search; closing it also clears the query. */
  toggleSearch: () => void;
  showAll: boolean;
  toggleShowAll: () => void;
}

export function useMyVideosControls(): MyVideosControls {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);

  const clearQuery = useCallback(() => setQuery(""), []);
  const toggleSearch = useCallback(() => {
    setSearchOpen((open) => {
      if (open) setQuery("");
      return !open;
    });
  }, []);
  const toggleShowAll = useCallback(() => setShowAll((value) => !value), []);

  return { searchOpen, query, setQuery, clearQuery, toggleSearch, showAll, toggleShowAll };
}

/** Search / page state of "Video tham khảo"; any search change returns to page 1. */
export interface SharedVideosControls {
  searchOpen: boolean;
  query: string;
  setQuery: (value: string) => void;
  clearQuery: () => void;
  toggleSearch: () => void;
  page: number;
  setPage: (page: number | ((page: number) => number)) => void;
}

export function useSharedVideosControls(): SharedVideosControls {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQueryState] = useState("");
  const [page, setPage] = useState(1);

  const setQuery = useCallback((value: string) => {
    setQueryState(value);
    setPage(1);
  }, []);
  const clearQuery = useCallback(() => {
    setQueryState("");
    setPage(1);
  }, []);
  const toggleSearch = useCallback(() => {
    setSearchOpen((open) => {
      if (open) {
        setQueryState("");
        setPage(1);
      }
      return !open;
    });
  }, []);

  return { searchOpen, query, setQuery, clearQuery, toggleSearch, page, setPage };
}
