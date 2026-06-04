-- prfm_ranking 테이블: KOPIS 박스오피스 순위 일별 수집 데이터
-- id: GENERATED ALWAYS AS IDENTITY (bigserial 대신 PostgreSQL/Supabase 권장 방식)
DROP TABLE IF EXISTS public.prfm_ranking;

CREATE TABLE public.prfm_ranking (
  id         bigint       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  genrenm    text         NOT NULL,         -- 장르명 (예: 연극, 뮤지컬)
  rank       integer      NOT NULL,         -- 순위
  prfmnm     text         NOT NULL,         -- 공연명
  period     text,                          -- 공연 기간 (예: 2025.01.01~2025.03.31)
  venuenm    text,                          -- 공연장명
  prfdtcnt   integer,                       -- 공연 회차 수
  area       text,                          -- 지역명 (예: 부산)
  posterurl  text,                          -- 포스터 이미지 URL
  prfmid     text,                          -- KOPIS 공연 ID (mt20id)
  catecode    text,                          -- 요청 파라미터 catecode (예: CCCA)
  crdt       date         NOT NULL,         -- 수집 기준일 (YYYY-MM-DD)
  created_at timestamptz  DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prfm_ranking_crdt        ON public.prfm_ranking (crdt);
CREATE INDEX IF NOT EXISTS idx_prfm_ranking_prfmid_crdt ON public.prfm_ranking (prfmid, crdt);
