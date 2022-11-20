create table chal (
	id text not null primary key,
	creator text not null,
    created_date timestamp not null,
    clue text not null,
    answer text not null
);

create table solve (
    id text not null primary key,
    chal_id text not null,
    solver text not null,
    solved_date timestamp not null
)
