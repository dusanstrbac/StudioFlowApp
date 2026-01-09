@echo off
echo Zaustavljam servis...
efrizer-service.exe stop

echo Proveravam nove pakete za instalaciju ...
call pnpm install

echo Pravim novi build (ovo moze potrajati)...
(echo y) | call pnpm run build

echo Pokrecem servis...
efrizer-service.exe start

echo Aplikacija je azurirana i pokrenuta!
pause