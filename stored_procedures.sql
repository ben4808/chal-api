CREATE OR REPLACE FUNCTION public.create_chal(
	id text,
	creator text,
    clue text,
    answer text)
    RETURNS void
    LANGUAGE 'plpgsql'
    COST 100
    VOLATILE PARALLEL UNSAFE
AS $BODY$
begin
    insert into chal (id, creator, created_date, clue, answer)
	values (id, creator, timezone('utc', now()), clue, answer);
end;
$BODY$;

CREATE OR REPLACE FUNCTION public.get_chal(id text)
    RETURNS table (
		id text,
	    creator text,
        created_date timestamp,
        clue text,
        answer text
	)
    LANGUAGE 'plpgsql'
    COST 100
    VOLATILE PARALLEL UNSAFE
AS $BODY$
begin
    return query select id, creator, created_date, clue, answer
	from chal
    where id = id;
end;
$BODY$;

CREATE OR REPLACE FUNCTION public.create_solve(
	id text,
	chal_id text,
    solver text)
    RETURNS void
    LANGUAGE 'plpgsql'
    COST 100
    VOLATILE PARALLEL UNSAFE
AS $BODY$
begin
    insert into solve (id, chal_id, solver, solve_date)
	values (id, chal_id, solver, timezone('utc', now());
end;
$BODY$;
