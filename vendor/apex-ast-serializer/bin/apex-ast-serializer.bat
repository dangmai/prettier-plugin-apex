@if "%DEBUG%" == "" @echo off
@rem ##########################################################################
@rem
@rem  apex-ast-serializer startup script for Windows
@rem
@rem ##########################################################################

@rem Set local scope for the variables with windows NT shell
if "%OS%"=="Windows_NT" setlocal

set DIRNAME=%~dp0
if "%DIRNAME%" == "" set DIRNAME=.
set APP_BASE_NAME=%~n0
set APP_HOME=%DIRNAME%..

@rem Add default JVM options here. You can also use JAVA_OPTS and APEX_AST_SERIALIZER_OPTS to pass JVM options to this script.
set DEFAULT_JVM_OPTS=

@rem Find java.exe
if defined JAVA_HOME goto findJavaFromJavaHome

set JAVA_EXE=java.exe
%JAVA_EXE% -version >NUL 2>&1
if "%ERRORLEVEL%" == "0" goto init

echo.
echo ERROR: JAVA_HOME is not set and no 'java' command could be found in your PATH.
echo.
echo Please set the JAVA_HOME variable in your environment to match the
echo location of your Java installation.

goto fail

:findJavaFromJavaHome
set JAVA_HOME=%JAVA_HOME:"=%
set JAVA_EXE=%JAVA_HOME%/bin/java.exe

if exist "%JAVA_EXE%" goto init

echo.
echo ERROR: JAVA_HOME is set to an invalid directory: %JAVA_HOME%
echo.
echo Please set the JAVA_HOME variable in your environment to match the
echo location of your Java installation.

goto fail

:init
@rem Get command-line arguments, handling Windows variants

if not "%OS%" == "Windows_NT" goto win9xME_args

:win9xME_args
@rem Slurp the command line arguments.
set CMD_LINE_ARGS=
set _SKIP=2

:win9xME_args_slurp
if "x%~1" == "x" goto execute

set CMD_LINE_ARGS=%*

:execute
@rem Setup the command line

set CLASSPATH=%APP_HOME%\lib\apex-ast-serializer-1.0-SNAPSHOT.jar;%APP_HOME%\lib\pmd-apex-6.6.0.jar;%APP_HOME%\lib\xstream-1.4.10.jar;%APP_HOME%\lib\commons-cli-1.4.jar;%APP_HOME%\lib\pmd-core-6.6.0.jar;%APP_HOME%\lib\commons-io-2.6.jar;%APP_HOME%\lib\pmd-apex-jorje-6.6.0-lib.jar;%APP_HOME%\lib\pmd-apex-jorje-6.6.0.pom;%APP_HOME%\lib\saxon-9.1.0.8.jar;%APP_HOME%\lib\saxon-9.1.0.8-dom.jar;%APP_HOME%\lib\xmlpull-1.1.3.1.jar;%APP_HOME%\lib\xpp3_min-1.1.4c.jar;%APP_HOME%\lib\jcommander-1.48.jar;%APP_HOME%\lib\javacc-5.0.jar;%APP_HOME%\lib\commons-lang3-3.7.jar;%APP_HOME%\lib\cglib-3.2.0.jar;%APP_HOME%\lib\asm-6.2.jar;%APP_HOME%\lib\gson-2.7.jar;%APP_HOME%\lib\logback-classic-1.1.7.jar;%APP_HOME%\lib\logback-core-1.1.7.jar;%APP_HOME%\lib\org.eclipse.xtend.lib-2.10.0.jar;%APP_HOME%\lib\org.eclipse.xtend.lib.macro-2.10.0.jar;%APP_HOME%\lib\org.eclipse.xtext.xbase.lib-2.10.0.jar;%APP_HOME%\lib\guava-22.0.jar;%APP_HOME%\lib\jsr305-3.0.1.jar;%APP_HOME%\lib\antlr-runtime-3.5.2.jar;%APP_HOME%\lib\jol-core-0.4.jar;%APP_HOME%\lib\slf4j-api-1.7.20.jar;%APP_HOME%\lib\snakeyaml-1.17.jar;%APP_HOME%\lib\aopalliance-1.0.jar;%APP_HOME%\lib\javax.inject-1.jar;%APP_HOME%\lib\ant-1.9.4.jar;%APP_HOME%\lib\error_prone_annotations-2.0.18.jar;%APP_HOME%\lib\j2objc-annotations-1.1.jar;%APP_HOME%\lib\animal-sniffer-annotations-1.14.jar;%APP_HOME%\lib\ant-launcher-1.9.4.jar

@rem Execute apex-ast-serializer
"%JAVA_EXE%" %DEFAULT_JVM_OPTS% %JAVA_OPTS% %APEX_AST_SERIALIZER_OPTS%  -classpath "%CLASSPATH%" net.dangmai.serializer.Apex %CMD_LINE_ARGS%

:end
@rem End local scope for the variables with windows NT shell
if "%ERRORLEVEL%"=="0" goto mainEnd

:fail
rem Set variable APEX_AST_SERIALIZER_EXIT_CONSOLE if you need the _script_ return code instead of
rem the _cmd.exe /c_ return code!
if  not "" == "%APEX_AST_SERIALIZER_EXIT_CONSOLE%" exit 1
exit /b 1

:mainEnd
if "%OS%"=="Windows_NT" endlocal

:omega
