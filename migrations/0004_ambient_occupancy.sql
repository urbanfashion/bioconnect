update presence
   set online = true,
       last_seen = null,
       status = 'available',
       room = 'partnering'
 where attendee_id in ('sarah', 'claire', 'daniel', 'john');

update presence
   set online = true,
       last_seen = null,
       status = 'available',
       room = 'coffee'
 where attendee_id in ('james', 'maya');

update presence
   set online = true,
       last_seen = null,
       status = 'available',
       room = 'science'
 where attendee_id in ('ananya', 'lena');

update presence
   set online = true,
       last_seen = null,
       status = 'available',
       room = 'investors'
 where attendee_id in ('thomas');
